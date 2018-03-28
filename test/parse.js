/* eslint-env mocha, node */
'use strict'

const expect = require('expect.js')
const {parse} = require('..')

describe('#parse()', () => {
  it('should parse valid document', done => {
    const str = '<gmd:MD_Metadata><gmd:fileIdentifier>hello</gmd:fileIdentifier></gmd:MD_Metadata>'
    parse(str, (err, result) => {
      expect(err).to.be(null)
      expect(result.type).to.eql('MD_Metadata')
      expect(result.body).to.eql({fileIdentifier: 'hello'})
      done()
    })
  })

  it('should pass with a valid but unknown document', done => {
    const str = '<hello><hella>Hi!</hella></hello>'
    parse(str, err => {
      expect(err).to.be(undefined)
      done()
    })
  })
})
