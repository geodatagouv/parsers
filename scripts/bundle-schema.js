const jsYaml = require('js-yaml');
const fs = require('fs');
const consolidate = require('../lib/consolidation').consolidateDefinition;

const definition = {};

['md-metadata', 'csw'].forEach(schemaName => {
    Object.assign(definition, jsYaml.safeLoad(fs.readFileSync(__dirname + `/../schema/${schemaName}.yml`)));
});

fs.writeFileSync(__dirname + '/../bundled-schema.json', JSON.stringify(consolidate(definition), true, 2));
