'use strict'

const once = require('once')
const Parser = require('./lib/parser')

function parse(xmlString, done) {
  done = once(done)
  const parser = new Parser()
  parser.once('result', result => done(null, result))
  parser.once('error', err => done(err)) // Will never be called
  parser.once('end', () => done())
  parser.end(xmlString)
}

exports.Parser = Parser
exports.parse = parse
