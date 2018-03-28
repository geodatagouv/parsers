#! /usr/bin/env node
'use strict'

const {Parser} = require('.')

const parser = new Parser()

process.stdin.pipe(parser).once('result', result => {
  process.stdout.write(JSON.stringify(result.body, true, 4))
  process.stdout.write('\n')
})
