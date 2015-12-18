/* eslint-env mocha, node */
'use strict';

const expect = require('expect.js');
const jsYaml = require('js-yaml');
const fs = require('fs');
const Parser = require('../lib/parser');

const definition = jsYaml.safeLoad(fs.readFileSync(__dirname + '/../schema/md-metadata.yml'));

describe('Real test cases', function () {
    it('geopicardie-tache-urbaine should be parsed successfully', function (done) {
        const parser = new Parser('MD_Metadata', definition);
        const xml = fs.createReadStream(__dirname + '/test-cases/geopicardie-tache-urbaine.xml');
        const expectedResult = require('./test-cases/geopicardie-tache-urbaine.json');
        xml.pipe(parser).once('result', result => {
            expect(result).to.eql(expectedResult);
            done();
        });
    });
});
