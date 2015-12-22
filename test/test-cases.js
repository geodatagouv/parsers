/* eslint-env mocha, node */
'use strict';

const expect = require('expect.js');
const jsYaml = require('js-yaml');
const fs = require('fs');
const Parser = require('../lib/parser');

const definition = jsYaml.safeLoad(fs.readFileSync(__dirname + '/../schema/md-metadata.yml'));

describe('Real test cases', function () {
    [
        'geopicardie-tache-urbaine',
        'rennes-metropole-referentiel-adresse',
        'ifremer-multilang',
        'siglr-malformed',
        'geobretagne-service-coupled',
    ].forEach(testCase => {
        it(testCase + ' should be parsed successfully', function (done) {
            const parser = new Parser('MD_Metadata', definition);
            const xml = fs.createReadStream(__dirname + '/test-cases/' + testCase + '.xml');
            const expectedResult = require('./test-cases/' + testCase + '.json');
            xml.pipe(parser).once('result', result => {
                expect(result).to.eql(expectedResult);
                done();
            });
        });
    })
});
