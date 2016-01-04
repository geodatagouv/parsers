'use strict';

const collectionIncludes = require('lodash/collection/includes');
const collectionForEach = require('lodash/collection/forEach');
const isObject = require('lodash/lang/isObject');
const EventEmitter = require('events').EventEmitter;
const Writable = require('readable-stream/writable');
const XmlParser = require('htmlparser2/lib/Parser');
const bundledSchema = require('../bundled-schema.json');

function strRight(str, separator) {
    const position = str.indexOf(separator);
    if (position) {
        return str.slice(position + 1);
    }
    return str;
}

class Context extends EventEmitter {

    constructor(parser, options) {
        if (!parser || !options.elementName || !options.onClose || !options.definition) {
            throw new Error('At least one required param is missing');
        }

        super();
        this.parser = parser;
        this.elementName = options.elementName;
        this.onClose = options.onClose;
        this.definition = options.definition;

        if (this.definition.type === 'object') {
            this.internalValue = {};
        }

        if (this.definition.from === 'text' || this.definition.fallbackText) {
            this.parser.toggleTextCapture(true);
        }

        if (options.attributes) {
            this.processAttributes(options.attributes);
        }
    }

    processAttributes(attrs) {
        if (this.definition.from === 'attributes') {
            this.internalValue = attrs[this.definition.attribute];
        }
        if (this.definition.attributes) {
            collectionForEach(attrs, (value, attrName) => {
                if (attrName in this.definition.attributes) {
                    this.internalValue[attrName] = value;
                }
            });
        }
    }

    // When opening element is a declared property of parent object
    isAcceptableProperty(name) {
        return this.definition.properties && name in this.definition.properties;
    }

    // When opening element is an acceptable value for the current property
    isAcceptablePropertyType(name) {
        return this.definition.accept && collectionIncludes(this.definition.accept, name);
    }

    // When opening element is an acceptable value for the parent container
    isAcceptableContentChild(name) {
        return this.definition.acceptedChildren && collectionIncludes(this.definition.acceptedChildren, name);
    }

    // When opening element is an acceptable child element for the current object
    isAcceptableChild(name) {
        return this.definition.children && name in this.definition.children;
    }

    identifyChildElement(name) {
        if (this.isAcceptableChild(name)) return 'child';
        if (this.isAcceptableContentChild(name)) return 'contentChild';
        if (this.isAcceptablePropertyType(name)) return 'propertyType';
        if (this.isAcceptableProperty(name)) return 'property';
    }

    onOpenTag(elementName, attributes) {
        const childElementType = this.identifyChildElement(elementName);
        if (!childElementType) return;

        this.parser.toggleTextCapture(false);

        const isProperty = childElementType === 'property';
        const element = isProperty ? this.elementName : elementName;

        const childDefinition = isProperty ?
            this.parser.getPropertyDefinition(this.elementName, elementName) :
            this.parser.getElementDefinition(elementName);

        this.parser.pushContext({
            elementName,
            attributes,
            definition: childDefinition,
            onClose: value => {
                if (!this.isAcceptableValue(value)) return;
                if (['child', 'property'].indexOf(childElementType) > -1) {
                    const definition = isProperty ? childDefinition : this.parser.getChildElementPropertyDefinition(this.elementName, elementName);
                    this.addPropertyValue(definition.renameTo ? definition.renameTo : elementName, value, definition.array);
                } else if (childElementType === 'propertyType') {
                    this.setValue(value);
                } else {
                    this.addValue(element, value);
                }
            }
        });
    }

    isAcceptableValue(value) {
        return value && (! isObject(value) || Object.keys(value).length !== 0);
    }

    addValue(elementName, value) {
        if (! this.internalValue.children) this.internalValue.children = [];
        value['@elementType'] = elementName;
        this.internalValue.children.push(value);
    }

    addPropertyValue(propertyName, value, arrayMode) {
        if (arrayMode) {
            if (! this.internalValue[propertyName]) {
                this.internalValue[propertyName] = [value];
            } else {
                this.internalValue[propertyName].push(value);
            }
        } else {
            this.internalValue[propertyName] = value;
        }
    }

    setValue(value) {
        this.internalValue = value;
    }

    isInTextMode() {
        return this.parser.capturingText && ! this.internalValue;
    }

    close() {
        if (this.isInTextMode()) {
            this.setValue(this.parser.flushTextBuffer());
        }
        this.onClose(this.internalValue);
    }

}

class Parser extends Writable {

    constructor() {
        super();
        this.definition = bundledSchema;
        this.acceptableRootElements = Object.keys(this.definition);

        this.elementStack = [];
        this.contextStack = [];

        this.parser = new XmlParser({
            onopentag: (name, attrs) => this.onOpenTag(name, attrs),
            onclosetag: name => this.onCloseTag(name),
            ontext: text => this.onText(text),
            onerror: err => this.emit('error', err), // Will never be called...
            onend: () => this.emit('end')
        }, { xmlMode: true, decodeEntities: true });

        this.once('finish', () => this.parser.end());
    }

    getElementDefinition(elementName) {
        return this.definition[elementName];
    }

    getPropertyDefinition(elementName, propertyName) {
        return this.getElementDefinition(elementName).properties[propertyName];
    }

    getChildElementPropertyDefinition(elementName, childElementProperty) {
        return this.getElementDefinition(elementName).children[childElementProperty];
    }

    get currentPosition() {
        return this.elementStack.length;
    }

    pushContext(options) {
        this.contextStack.push({
            context: new Context(this, options),
            position: this.currentPosition - 1
        });
    }

    hasContext() {
        return this.contextStack.length > 0;
    }

    get currentContext() {
        return this.contextStack[this.contextStack.length - 1].context;
    }

    get currentContextPosition() {
        return this.contextStack[this.contextStack.length - 1].position;
    }

    popContext() {
        this.currentContext.close();
        return this.contextStack.pop();
    }

    isAtRoot() {
        return this.elementStack.length === 1;
    }

    onResult(name, value) {
        this.emit('result', { type: name, body: value });
    }

    /* Text capture */

    toggleTextCapture(targetMode) {
        if ((this.capturingText && !targetMode) || (targetMode && !this.capturingText)) {
            this.capturingText = targetMode;
            this.textBuffer = '';
        }
    }

    bufferText(text) {
        if (!this.capturingText) return;
        this.textBuffer = this.textBuffer + text.trim();
    }

    flushTextBuffer() {
        if (!this.capturingText) return;
        const buffer = this.textBuffer;
        this.toggleTextCapture(false);
        return buffer;
    }

    /* XML stream handlers */

    onOpenTag(name, attributes) {
        name = strRight(name, ':');
        this.elementStack.push(name);
        if (this.isAtRoot() && !this.hasContext() && this.acceptableRootElements.indexOf(name) > -1) {
            this.pushContext({
                elementName: name,
                attributes,
                definition: this.definition[name],
                onClose: value => this.onResult(name, value)
            });
        } else if (this.hasContext()) {
            this.currentContext.onOpenTag(name, attributes);
        }
    }

    onCloseTag() {
        this.elementStack.pop();
        if (! this.hasContext()) return;
        if (this.currentContextPosition === this.currentPosition) {
            this.popContext();
        }
    }

    onText(text) {
        this.bufferText(text);
    }

    /* Writeable stream methods */

    _write(chunk, encoding, callback) {
        this.parser.write(chunk);
        callback();
    }

}

module.exports = Parser;
