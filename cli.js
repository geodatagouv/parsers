#! /usr/bin/env node
const Parser = require('./').Parser;
const parser = new Parser();

process.stdin.pipe(parser).once('result', result => {
    process.stdout.write(JSON.stringify(result, true, 4));
    process.stdout.write('\n');
});
