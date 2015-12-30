# inspire-parser
Powerful XML parser to deal with Inspire and OGC standarts

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
const fs = require('fs');
const parse = require('inspire-parser').parse;

const xmlString = fs.readFileSync(pathToXmlFile);

parse(xmlString, (err, result) => {
    console.log(JSON.stringify(result.body, true, 4));
});
```

### Stream

```js
const fs = require('fs');
const Parser = require('inspire-parser').Parser;

const parser = new Parser();
const xmlStream = fs.createReadStream(pathToXmlFile);

xmlStream.pipe(parser).once('result', result => {
    console.log(JSON.stringify(result.body, true, 4));
});
```
