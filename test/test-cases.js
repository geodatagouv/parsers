/* eslint-env mocha, node */
'use strict'

const {join} = require('path')
const fs = require('fs')
const expect = require('expect.js')
const {Parser} = require('..')

function createTestCase(name) {
  it(name + ' should be parsed successfully', done => {
    const parser = new Parser()
    const xml = fs.createReadStream(join(__dirname, 'test-cases', name + '.xml'))
    const expectedResult = require('./test-cases/' + name + '.json')
    xml.pipe(parser).once('result', result => {
      expect(JSON.parse(JSON.stringify(result.body))).to.eql(expectedResult)
      done()
    })
  })
}

describe('Real test cases: MD_Metadata', () => {
  [
    'geopicardie-tache-urbaine',
    'rennes-metropole-referentiel-adresse',
    'ifremer-multilang',
    'siglr-malformed',
    'geobretagne-service-coupled',
    'geobretagne-bano'
  ].forEach(testCase => createTestCase(testCase))
})

describe('Real test cases: FC_FeatureCatalogue', () => {
  [
    'geobretagne-featurecatalogue'
  ].forEach(testCase => createTestCase(testCase))
})

describe('Real test cases: GetRecordsResponse', () => {
  [
    'csw-getrecordsresponse'
  ].forEach(testCase => createTestCase(testCase))
})

describe('Real test cases: GetRecordByIdResponse', () => {
  [
    'csw-getrecordbyidresponse'
  ].forEach(testCase => createTestCase(testCase))
})

describe('Real test cases: Capabilities', () => {
  [
    'csw-getcapabilities'
  ].forEach(testCase => createTestCase(testCase))
})

describe('Real test cases: Record', () => {
  [
    'grandlyon-dc',
    'adour-garonne-dc',
    'grand-lyon-dc-brief'
  ].forEach(testCase => createTestCase(testCase))
})

describe('Real test cases: ExceptionReport', () => {
  [
    'exception-report'
  ].forEach(testCase => createTestCase(testCase))
})
