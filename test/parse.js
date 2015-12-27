/* eslint-env mocha, node */
'use strict';

const expect = require('expect.js');
const parse = require('../').parse;

describe('#parse()', function () {
    it('should parse valid document', function (done) {
        const str = '<gmd:MD_Metadata><gmd:fileIdentifier>hello</gmd:fileIdentifier></gmd:MD_Metadata>';
        parse(str, (err, result) => {
            expect(result).to.eql({ fileIdentifier: 'hello' });
            done();
        });
    });

    it('should fail with not valid document', function (done) {
        const str = '<>';
        parse(str, (err) => {
            expect(err).to.be.a(Error);
            done();
        });
    });
});
