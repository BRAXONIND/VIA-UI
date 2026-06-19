import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {splitVendorChunkPlugin} from 'vite';
import {createHtmlPlugin} from 'vite-plugin-html';
import fs from 'fs';
import {execFile} from 'child_process';

const hash = fs.readFileSync('public/definitions/hash.json', 'utf8');

const nativeWindowsPicker = () => {
  const attach = (middlewares: any) => {
    middlewares.use('/api/select-executable', (request: any, response: any) => {
      if (request.method === 'HEAD') {
        response.statusCode = 204;
        response.end();
        return;
      }

      if (request.method !== 'GET' || process.platform !== 'win32') {
        response.statusCode = 405;
        response.end();
        return;
      }

      const script = [
        'Add-Type -AssemblyName System.Windows.Forms',
        '$dialog = New-Object System.Windows.Forms.OpenFileDialog',
        "$dialog.Title = 'Select an app'",
        "$dialog.Filter = 'Applications (*.exe)|*.exe|Shortcuts (*.lnk)|*.lnk|All files (*.*)|*.*'",
        '$dialog.CheckFileExists = $true',
        '$dialog.Multiselect = $false',
        "if ($dialog.ShowDialog() -eq 'OK') {",
        '  [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()',
        '  Write-Output $dialog.FileName',
        '}',
      ].join('; ');

      execFile(
        'powershell.exe',
        ['-NoProfile', '-STA', '-Command', script],
        {encoding: 'utf8', windowsHide: false},
        (error, stdout) => {
          response.setHeader('Content-Type', 'application/json');
          if (error) {
            response.statusCode = 500;
            response.end(JSON.stringify({error: 'Unable to open picker'}));
            return;
          }
          response.end(JSON.stringify({path: stdout.trim()}));
        },
      );
    });
  };

  return {
    name: 'braxon-native-windows-picker',
    configureServer(server: any) {
      attach(server.middlewares);
    },
    configurePreviewServer(server: any) {
      attach(server.middlewares);
    },
  };
};

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/VIA-UI/' : '/',
  plugins: [
    nativeWindowsPicker(),
    react(),
    createHtmlPlugin({
      inject: {
        data: {
          hash,
        },
      },
    }),
    splitVendorChunkPlugin(),
  ],
  assetsInclude: ['**/*.glb'],
  envDir: '.',
  server: {open: true},
  resolve: {
    alias: {
      src: path.resolve(__dirname, './src'),
      assets: path.resolve(__dirname, './src/assets'),
    },
  },
  optimizeDeps: {
    include: ['@the-via/reader'],
    esbuildOptions: {
      // Node.js global to browser globalThis
      define: {
        global: 'globalThis',
      },
      // Enable esbuild polyfill plugins
      plugins: [],
    },
  },
});
