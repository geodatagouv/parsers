'use strict'

const {join} = require('path')
const fs = require('fs')
const jsYaml = require('js-yaml')
const consolidate = require('../lib/consolidation').consolidateDefinition

const definition = {};

[
  'gmd/main',
  'gmd/service',
  'gmd/constraints',
  'csw',
  'dublin-core',
  'fc-featurecatalogue',
  'ows'
].forEach(schemaName => {
  Object.assign(definition, jsYaml.safeLoad(fs.readFileSync(join(__dirname, '..', 'schema', schemaName + '.yml'))))
})

fs.writeFileSync(join(__dirname, '..', 'bundled-schema.json'), JSON.stringify(consolidate(definition), true, 2))
