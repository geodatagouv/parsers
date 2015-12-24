# inspire-parsers
Essential XML parsers to deal with Inspire and OGC standarts

[![Circle CI](https://circleci.com/gh/sgmap-inspire/parsers/tree/master.svg?style=shield)](https://circleci.com/gh/sgmap-inspire/parsers/tree/master)
[![Coverage Status](https://coveralls.io/repos/sgmap-inspire/parsers/badge.svg?branch=master&service=github)](https://coveralls.io/github/sgmap-inspire/parsers?branch=master)

## Usage (experimental)

### Basic

```js
const fs = require('fs');
const parse = require('inspire-parsers').parse;

const xmlString = fs.readFileSync(pathToXmlFile);

parse(xmlString, 'MD_Metadata', (err, result) => {
    console.log(JSON.stringify(result, true, 4));
});
```

### Stream

```js
const fs = require('fs');
const Parser = require('inspire-parsers').Parser;

const parser = new Parser('MD_Metadata');
const xmlStream = fs.createReadStream(pathToXmlFile);

xmlStream.pipe(parser).once('result', result => {
    console.log(JSON.stringify(result, true, 4));
});
```
