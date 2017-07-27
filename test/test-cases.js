/* eslint-env mocha, node */
'use strict'

const fs = require('fs')
const expect = require('expect.js')
const Parser = require('../').Parser

function createTestCase(name) {
  it(name + ' should be parsed successfully', function (done) {
    const parser = new Parser()
    const xml = fs.createReadStream(__dirname + '/test-cases/' + name + '.xml')
    const expectedResult = require('./test-cases/' + name + '.json')
    xml.pipe(parser).once('result', result => {
      expect(JSON.parse(JSON.stringify(result.body))).to.eql(expectedResult)
      done()
    })
  })
}

describe('Real test cases: MD_Metadata', function () {
  [
    'geopicardie-tache-urbaine',
    'rennes-metropole-referentiel-adresse',
    'ifremer-multilang',
    'siglr-malformed',
    'geobretagne-service-coupled',
  ].forEach(testCase => createTestCase(testCase))
})

describe('Real test cases: FC_FeatureCatalogue', function () {
  [
    'geobretagne-featurecatalogue',
  ].forEach(testCase => createTestCase(testCase))
})

describe('Real test cases: GetRecordsResponse', function () {
  [
    'csw-getrecordsresponse',
  ].forEach(testCase => createTestCase(testCase))
})

describe('Real test cases: GetRecordByIdResponse', function () {
  [
    'csw-getrecordbyidresponse',
  ].forEach(testCase => createTestCase(testCase))
})

describe('Real test cases: Capabilities', function () {
  [
    'csw-getcapabilities',
  ].forEach(testCase => createTestCase(testCase))
})

describe('Real test cases: Record', function () {
  [
    'grandlyon-dc',
    'adour-garonne-dc',
    'grand-lyon-dc-brief',
  ].forEach(testCase => createTestCase(testCase))
})

describe('Real test cases: ExceptionReport', function () {
  [
    'exception-report',
  ].forEach(testCase => createTestCase(testCase))
})
