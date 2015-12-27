const Parser = require('./lib/parser');
const once = require('lodash/function/once');

function parse(xmlString, done) {
    done = once(done);
    const parser = new Parser();
    parser.once('result', result => done(null, result));
    parser.once('error', err => done(err));
    parser.once('end', () => done(new Error('No result found')));
    parser.end(xmlString);
}

exports.Parser = Parser;
exports.parse = parse;
