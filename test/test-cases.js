/* eslint-env mocha, node */
/* eslint comma-dangle:0 */
'use strict';

const expect = require('expect.js');
const jsYaml = require('js-yaml');
const fs = require('fs');
const Parser = require('../lib/parser');

const definition = jsYaml.safeLoad(fs.readFileSync(__dirname + '/../schema/md-metadata.yml'));
Object.assign(definition, jsYaml.safeLoad(fs.readFileSync(__dirname + '/../schema/csw.yml')));

function createTestCase(name, schema) {
    it(name + ' should be parsed successfully', function (done) {
        const parser = new Parser(schema, definition);
        const xml = fs.createReadStream(__dirname + '/test-cases/' + name + '.xml');
        const expectedResult = require('./test-cases/' + name + '.json');
        xml.pipe(parser).once('result', result => {
            expect(result).to.eql(expectedResult);
            done();
        });
    });
}

describe('Real test cases: MD_Metadata', function () {
    [
        'geopicardie-tache-urbaine',
        'rennes-metropole-referentiel-adresse',
        'ifremer-multilang',
        'siglr-malformed',
        'geobretagne-service-coupled',
    ].forEach(testCase => createTestCase(testCase, 'MD_Metadata'));
});

describe('Real test cases: GetRecordsResponse', function () {
    [
        'csw-getrecordsresponse',
    ].forEach(testCase => createTestCase(testCase, 'GetRecordsResponse'));
});
