# inspire-parser
Powerful XML parser to deal with Inspire and OGC standards

[![npm version](https://img.shields.io/npm/v/inspire-parser.svg)](https://www.npmjs.com/package/inspire-parser)
[![Circle CI](https://circleci.com/gh/sgmap-inspire/parsers/tree/master.svg?style=shield)](https://circleci.com/gh/sgmap-inspire/parsers/tree/master)
[![Coverage Status](https://coveralls.io/repos/sgmap-inspire/parsers/badge.svg?branch=master&service=github)](https://coveralls.io/github/sgmap-inspire/parsers?branch=master)
[![Dependency Status](https://david-dm.org/sgmap-inspire/parsers.svg)](https://david-dm.org/sgmap-inspire/parsers)

## Prerequisite

* [Node.js](https://nodejs.org) >= 4.0
* OR [Babel](https://babeljs.io/) for older Node.js versions + browser

## Usage (CLI)

### Installation

```
npm install -g inspire-parser
```

### CLI

```bash
cat metadata.xml | inspire2json
```

## Usage (library)

### Installation

```
npm install inspire-parser
```

### Basic

```js
const parse = require('inspire-parser').parse;

const xmlString = `<csw:Record xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dct="http://purl.org/dc/terms/">
  <dc:title>Prochains passages temps réel du réseau TCL</dc:title>
  <dc:subject>Réseaux de transport</dc:subject>
  <dc:subject>Services d'utilité publique et services publics</dc:subject>
</csw:Record>`;

parse(xmlString, (err, result) => {
    console.log(result.type); // print parsed element type: Record
    console.log(JSON.stringify(result.body, true, 4)); // Print parsed result below
});
```

Result (very basic example):
```json
{
    "title": "Prochains passages temps réel du réseau TCL",
    "subject": [
        "Réseaux de transport",
        "Services d'utilité publique et services publics"
    ]
}
```

### Stream

```js
const fs = require('fs');
const Parser = require('inspire-parser').Parser;

const parser = new Parser();
const xmlStream = fs.createReadStream(pathToXmlFile);

xmlStream.pipe(parser).once('result', result => {
    console.log(result.type); // print parsed element type
    console.log(JSON.stringify(result.body, true, 4)); // Print parsed result in JSON
});
```
