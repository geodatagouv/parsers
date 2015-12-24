/* eslint-env mocha, node */
/* eslint comma-dangle:0 */
'use strict';

const fs = require('fs');
const expect = require('expect.js');
const Parser = require('../').Parser;

function createTestCase(name, schema) {
    it(name + ' should be parsed successfully', function (done) {
        const parser = new Parser(schema);
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
