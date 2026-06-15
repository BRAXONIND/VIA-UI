# Braxon VIA Configurator

A custom VIA-based configurator made for **Braxon macropads**.

Website: [https://braxon.in/](https://braxon.in/)

This project is a customized version of the VIA web application, built for Braxon's own macropad products and custom configuration workflow. It keeps the familiar VIA-style experience while adding extra features made specifically for Braxon users.

## About This Project

The Braxon VIA Configurator is designed to make macropad customization easier, faster, and more powerful. It allows users to configure keymaps, macros, display options, and debugging features from a clean web-based interface.

This version includes custom additions for Braxon macropads, including support for advanced macro management, gamepad keycodes, ST7789 display customization, focus timer features, and a similar configurator interface for wireless ZMK-based macropads.

## Key Features

- Custom-made VIA UI for Braxon macropads
- Support for gamepad keycodes
- Macro renaming support
- Up to 65 custom macros
- Website-launch macros using webpage URLs
- Application-launch macros using selected `.exe` files
- ST7789 display support
- Custom names for macros and keycodes
- Built-in focus timer with support for up to 99 minutes
- Debug mode for testing and troubleshooting
- Custom configurator UI for wireless ZMK-based macropads
- Extra ZMK customization features not available in standard ZMK tools

## Macro Features

Users can create and manage custom macros directly from the configurator. These macros can be used for normal keyboard actions, opening websites, or launching applications.

For website macros, users only need to enter the webpage URL.

For application macros, users can select the required `.exe` file and assign it to a key or macro slot.

## Display Features

This configurator includes support for an **ST7789 display**. Users can customize macro names, keycode names, and display-related options from the interface.

The display feature is designed for Braxon macropads that include screen support.

## Focus Timer

A built-in focus timer is included for productivity use. Users can set timer durations up to **99 minutes**, making the macropad useful for study sessions, work sessions, and focus-based workflows.

## Debug Mode

The configurator includes a debug mode for testing and troubleshooting. This helps users check whether keys, macros, display features, and other functions are working correctly.


## Local Development

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open the local URL shown in the terminal, usually:

```text
http://localhost:5173
```

Build for production:

```bash
npm run build
```

The production build will be generated in the `dist` folder.

## Deployment

This project can be deployed using services like:

- Vercel
- Netlify
- GitHub Pages

For Vercel, use:

```text
Build Command: npm run build
Output Directory: dist
```

## Credits

This project is based on the open-source VIA web application and customized for Braxon macropad use.

VIA is an open-source web-based keyboard configurator for QMK-powered keyboards.

## Disclaimer

This is a customized Braxon version for Braxon macropads and related development use. It is not an official VIA release unless stated otherwise by the VIA project maintainers.
