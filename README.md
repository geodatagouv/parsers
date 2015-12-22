# inspire-parsers
Essential XML parsers to deal with Inspire and OGC standarts

[![Circle CI](https://circleci.com/gh/sgmap-inspire/parsers/tree/master.svg?style=shield)](https://circleci.com/gh/sgmap-inspire/parsers/tree/master)
[![Coverage Status](https://coveralls.io/repos/sgmap-inspire/parsers/badge.svg?branch=master&service=github)](https://coveralls.io/github/sgmap-inspire/parsers?branch=master)

## Usage (experimental)

```js
const jsYaml = require('js-yaml');
const fs = require('fs');
const Parser = require('inspire-parsers/lib/parser');

const definition = jsYaml.safeLoad(fs.readFileSync(require.resolve('inspire-parsers/schema/md-metadata.yml')));
const parser = new Parser('MD_Metadata', definition);
const xmlFile = fs.createReadStream(pathToXmlFile);

xmlFile.pipe(parser).once('result', result => {
    console.log(JSON.stringify(result, true, 4));
});
```
