// SPEC §9: Schema-Validierung von content/ vor dem Build.
// Bricht mit Exit-Code 1 ab, wenn profile.yaml das Schema verletzt.
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import yaml from 'js-yaml';
import Ajv2020Import from 'ajv/dist/2020.js';
import addFormatsImport from 'ajv-formats';

// ESM/CJS-Interop robust auflösen.
const Ajv2020 = Ajv2020Import.default ?? Ajv2020Import;
const addFormats = addFormatsImport.default ?? addFormatsImport;

const root = process.cwd();
const schemaPath = path.join(root, 'schema', 'profile.schema.json');
const dataPath = path.join(root, 'content', 'profile.yaml');

const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const data = yaml.load(fs.readFileSync(dataPath, 'utf8'));

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

const validate = ajv.compile(schema);
const ok = validate(data);

if (!ok) {
  console.error('✖ content/profile.yaml verletzt schema/profile.schema.json:');
  for (const err of validate.errors ?? []) {
    console.error(`  - ${err.instancePath || '/'} ${err.message}`);
  }
  process.exit(1);
}

console.log('✔ content/profile.yaml ist valide.');
