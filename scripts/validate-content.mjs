// SPEC §9: Schema-Validierung von content/ vor dem Build.
// Bricht mit Exit-Code 1 ab, wenn profile.yaml oder intents.yaml das Schema verletzt.
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
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

let allOk = true;

function validate(schemaPath, dataPath, label) {
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  const data = yaml.load(fs.readFileSync(dataPath, 'utf8'));
  const fn = ajv.compile(schema);
  if (!fn(data)) {
    console.error(`✖ ${label} verletzt ${path.relative(root, schemaPath)}:`);
    for (const err of fn.errors ?? []) {
      console.error(`  - ${err.instancePath || '/'} ${err.message}`);
    }
    allOk = false;
  } else {
    console.log(`✔ ${label} ist valide.`);
  }
}

validate(
  path.join(root, 'schema', 'profile.schema.json'),
  path.join(root, 'content', 'profile.yaml'),
  'content/profile.yaml',
);

validate(
  path.join(root, 'schema', 'intents.schema.json'),
  path.join(root, 'content', 'intents.yaml'),
  'content/intents.yaml',
);

validate(
  path.join(root, 'schema', 'pose-envelopes.schema.json'),
  path.join(root, 'content', 'pose-envelopes.yaml'),
  'content/pose-envelopes.yaml',
);

if (!allOk) process.exit(1);

