const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {
  keyboardDefinitionV3ToVIADefinitionV3,
} = require('@the-via/reader');

const sourcePath = path.resolve(__dirname, '..', '..', 'via.json');
const definitionsPath = path.resolve(__dirname, '..', 'public', 'definitions');
const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const definition = keyboardDefinitionV3ToVIADefinitionV3(source);
const id = definition.vendorProductId;

fs.mkdirSync(path.join(definitionsPath, 'v3'), {recursive: true});
fs.writeFileSync(
  path.join(definitionsPath, 'v3', `${id}.json`),
  JSON.stringify(definition),
);

const supportedPath = path.join(definitionsPath, 'supported_kbs.json');
const supported = JSON.parse(fs.readFileSync(supportedPath, 'utf8'));
if (!supported.vendorProductIds.v2.includes(id)) {
  supported.vendorProductIds.v3 = Array.from(
    new Set([...supported.vendorProductIds.v3, id]),
  ).sort((a, b) => a - b);
}
fs.writeFileSync(supportedPath, JSON.stringify(supported, null, 2));

const namesPath = path.join(definitionsPath, 'keyboard_names.json');
const names = JSON.parse(fs.readFileSync(namesPath, 'utf8'));
fs.writeFileSync(
  namesPath,
  JSON.stringify(Array.from(new Set([...names, definition.name])).sort(), null, 2),
);

const hashPath = path.join(definitionsPath, 'hash.json');
const hash = crypto
  .createHash('sha256')
  .update(fs.readFileSync(hashPath))
  .update(JSON.stringify(definition))
  .digest('hex');
fs.writeFileSync(hashPath, JSON.stringify(hash));

console.log(`Injected ${definition.name} (${id})`);
