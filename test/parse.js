/* eslint-env mocha, node */
'use strict';

const expect = require('expect.js');
const parse = require('../').parse;

describe('#parse()', function () {
    it('should parse valid document', function (done) {
        const str = '<gmd:MD_Metadata><gmd:fileIdentifier>hello</gmd:fileIdentifier></gmd:MD_Metadata>';
        parse(str, (err, result) => {
            expect(result.type).to.eql('MD_Metadata');
            expect(result.body).to.eql({ fileIdentifier: 'hello' });
            done();
        });
    });

    it('should pass with a valid but unknown document', function (done) {
        const str = '<hello><hella>Hi!</hella></hello>';
        parse(str, (err) => {
            expect(err).to.be(undefined);
            done();
        });
    });
});
