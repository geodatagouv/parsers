/* eslint comma-dangle: [2, "always-multiline"] */
const jsYaml = require('js-yaml');
const fs = require('fs');
const consolidate = require('../lib/consolidation').consolidateDefinition;

const definition = {};

[
    'md-metadata',
    'csw',
    'dublin-core',
    'wms-130',
    'wms-111',
].forEach(schemaName => {
    Object.assign(definition, jsYaml.safeLoad(fs.readFileSync(__dirname + `/../schema/${schemaName}.yml`)));
});

fs.writeFileSync(__dirname + '/../bundled-schema.json', JSON.stringify(consolidate(definition), true, 2));
