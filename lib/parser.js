'use strict';

const collectionIncludes = require('lodash/collection/includes');
const mapValues = require('lodash/object/mapValues');
const isArray = require('lodash/lang/isArray');
const isString = require('lodash/lang/isString');
const isObject = require('lodash/lang/isObject');
const EventEmitter = require('events').EventEmitter;
const XmlParser = require('htmlparser2').Parser;

function strRight(str, separator) {
    const position = str.indexOf(separator);
    if (position) {
        return str.slice(position + 1);
    }
    return str;
}

class Context {

    constructor(parser, type, params) {
        this.parser = parser;
        this.type = type;
        this.parentContext = params.parentContext;

        if (this.type === 'root') {
            this.initAsRoot(params.acceptableChildren);
        }

        if (this.type === 'element') {
            this.element = params.element;
            this.initAsElement(this.parser.getElementDefinition(this.element));
        }

        if (this.type === 'property') {
            this.element = params.element;
            this.property = params.property;
            this.initAsProperty(this.parser.getPropertyDefinition(this.element, this.property));
        }
    }

    initAsRoot(acceptableChildren) {
        this.type = 'root';
        this.acceptableChildren = acceptableChildren;
    }

    initAsElement(elementDefinition) {
        this.type = 'element';
        this.definition = elementDefinition;

        if (this.definition.type === 'object' && this.definition.properties) {
            this.internalValue = {};
            this.acceptableChildren = Object.keys(this.definition.properties);
        }
        if (this.definition.from === 'text') {
            this.startCapturingText()
        }
    }

    initAsProperty(propertyDefinition) {
        this.type = 'property';
        this.definition = propertyDefinition;
        this.acceptableChildren = this.definition.accept;
        if (this.definition.from === 'text' || this.definition.fallbackText) {
            this.startCapturingText()
        }
    }

    startCapturingText() {
        this.capturingText = true;
        this.textBuffer = '';
    }

    bufferText(text) {
        this.textBuffer = this.textBuffer + text.trim();
    }

    stopCapturingText() {
        this.capturingText = false;
        this.textBuffer = null;
    }

    isAcceptableChild(childName) {
        if (! this.acceptableChildren) return false;
        return collectionIncludes(this.acceptableChildren, childName);
    }

    onText(text) {
        if (this.capturingText) {
            this.bufferText(text);
        }
    }

    processAttributes(attrs) {
        if (this.definition.from === 'attributes') {
            this.internalValue = attrs[this.definition.attribute];
        }
    }

    onOpenTag(name, attrs) {
        if (this.isAcceptableChild(name)) {
            this.stopCapturingText();
            if (this.type === 'property' || this.type === 'root') {
                this.childContext = new Context(this.parser, 'element', {
                    element: name,
                    parentContext: this
                });
                this.parser.pushContext(this.childContext);
            }
            if (this.type === 'element') {
                this.childContext = new Context(this.parser, 'property', {
                    element: this.element,
                    property: name,
                    parentContext: this
                });
                this.currentProperty = name;
                this.parser.pushContext(this.childContext);
            }
            this.childContext.processAttributes(attrs);
        }
    }

    onProperty(property, value) {
        if (!value || (isObject(value) && Object.keys(value).length === 0)) return;
        if (this.parser.getPropertyDefinition(this.element, property).array) {
            if (! this.internalValue[property]) {
                this.internalValue[property] = [value];
            } else {
                this.internalValue[property].push(value);
            }
        } else {
            this.internalValue[property] = value;
        }
    }

    onValue(value) {
        this.internalValue = value;
        if (this.type === 'root') this.parser.onValue(this.internalValue);
    }

    resetCaptureMode() {
        this.captureMode = null;
    }

    onChildContextClose(value) {
        if (this.childContext.type === 'property') {
            this.onProperty(this.currentProperty, value);
        }
        if (this.childContext.type === 'element') {
            this.onValue(value);
        }
    }

    close() {
        if (this.capturingText && ! this.internalValue) {
            this.internalValue = this.textBuffer;
        }
        if (this.parentContext !== this.parser) {
            this.parentContext.onChildContextClose(this.internalValue);
        } else {
            this.parser.onValue(this.internalValue);
        }
    }

}

class Parser extends EventEmitter {

    constructor(rootElement, definition) {
        if (!definition) throw new Error('Definition is required');
        super();
        this.definition = mapValues(definition, el => this.consolidateElement(el));

        this.elementStack = [];
        this.contextStack = [];

        this.pushContext(new Context(this, 'root', {
            acceptableChildren: [rootElement],
            parentContext: this
        }));

        this.parser = new XmlParser({
            onopentag: (name, attrs) => this.onOpenTag(name, attrs),
            onclosetag: name => this.onCloseTag(name),
            ontext: text => this.onText(text)
        }, { xmlMode: true, decodeEntities: true });

        this.parser
            .on('drain', () => this.emit('drain'))
            .on('finish', () => this.emit('finish'))
            .on('pipe', (src) => this.emit('pipe', src))
            .on('unpipe', (src) => this.emit('unpipe', src))
            .on('error', (error) => this.emit('error', error));
    }

    consolidateProperty(prop) {
        if (prop.accept && ! isArray(prop.accept)) {
            prop.accept = [prop.accept];
        }
        if (! prop.from && prop.accept) {
            prop.from = 'children';
        }
        if (! prop.from) {
            prop.from = 'text';
        }

        return prop;
    }

    consolidateElement(el) {
        if (! el.type && el.properties) {
            el.type = 'object';
        }
        if (! el.type) {
            throw new Error('Unable to compute type');
        }
        if (isString(el.type) && el.type !== 'object' && !el.from) {
            el.from = 'text';
        }
        if (el.type === 'object') {
            el.properties = mapValues(el.properties, prop => this.consolidateProperty(prop));
        }

        return el;
    }

    getElementDefinition(elementName) {
        return this.definition[elementName];
    }

    getPropertyDefinition(elementName, propertyName) {
        return this.getElementDefinition(elementName).properties[propertyName];
    }

    get currentPosition() {
        return this.elementStack.length;
    }

    pushContext(context) {
        this.contextStack.push({ context, position: this.currentPosition - 1 });
    }

    get currentContext() {
        return this.contextStack[this.contextStack.length - 1].context;
    }

    get currentContextPosition() {
        return this.contextStack[this.contextStack.length - 1].position;
    }

    popContext() {
        return this.contextStack.pop();
    }

    isAtRoot() {
        return this.elementStack.length === 0;
    }

    onValue(value) {
        this.emit('result', value);
    }

    /* XML stream handlers */

    onOpenTag(name, attrs) {
        name = strRight(name, ':');
        this.elementStack.push(name);
        this.currentContext.onOpenTag(name, attrs);
    }

    onCloseTag(name) {
        this.elementStack.pop();
        if (this.currentContextPosition === this.currentPosition) {
            this.currentContext.close();
            this.popContext();
        }
    }

    onText(text) {
        this.currentContext.onText(text);
    }

    /* Writeable stream methods */

    write(chunk, encoding, callback) {
        this.parser.write(chunk, encoding, callback);
    }

    end(chunk, encoding, callback) {
        this.parser.end(chunk, encoding, callback);
    }

    /* Cleanup */

    clean() {
        this.removeAllListeners();
    }

}

module.exports = Parser;
