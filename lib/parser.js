'use strict';

const collectionIncludes = require('lodash/collection/includes');
const collectionForEach = require('lodash/collection/forEach');
const isObject = require('lodash/lang/isObject');
const EventEmitter = require('events').EventEmitter;
const XmlParser = require('htmlparser2').Parser;
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
        super();
        this.parser = parser;
        this.type = options.type;
        this.elementName = options.elementName;
        this.acceptableChildren = options.acceptableChildren;
        this.onClose = options.onClose;
        this.definition = options.definition;

        if (!this.definition || this.definition.type === 'object') {
            this.internalValue = {};
        }

        if (this.definition && (this.definition.from === 'text' || this.definition.fallbackText)) {
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
        return this.definition && this.definition.properties && name in this.definition.properties;
    }

    // When opening element is an acceptable value for the current property
    isAcceptablePropertyType(name) {
        return this.definition && this.definition.accept && collectionIncludes(this.definition.accept, name);
    }

    // When opening element is an acceptable value for the parent container
    isAcceptableContentChild(name) {
        if (this.type === 'root') {
            return collectionIncludes(this.acceptableChildren, name);
        }
        return this.definition.acceptedChildren && collectionIncludes(this.definition.acceptedChildren, name);
    }

    // When opening element is an acceptable child element for the current object
    isAcceptableChild(name) {
        return this.definition && this.definition.children && name in this.definition.children;
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
            type: childElementType,
            elementName,
            definition: childDefinition,
            attributes,
            onClose: value => {
                if (this.type === 'root') {
                    return this.onClose(value);
                }

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

    addValue(elementName, value) {
        if (!value || (isObject(value) && Object.keys(value).length === 0)) return;
        if (! this.internalValue.children) this.internalValue.children = [];
        value['@elementType'] = elementName;
        this.internalValue.children.push(value);
    }

    addPropertyValue(propertyName, value, arrayMode) {
        if (!value || (isObject(value) && Object.keys(value).length === 0)) return;

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
        if (this.onClose) this.onClose(this.internalValue);
    }

}

class Parser extends EventEmitter {

    constructor(rootElement) {
        super();
        this.definition = bundledSchema;

        this.elementStack = [];
        this.contextStack = [];

        this.pushContext({
            type: 'root',
            acceptableChildren: [rootElement],
            onClose: value => this.onValue(value)
        });

        this.parser = new XmlParser({
            onopentag: (name, attrs) => this.onOpenTag(name, attrs),
            onclosetag: name => this.onCloseTag(name),
            ontext: text => this.onText(text),
            onerror: err => this.emit('error', err),
            onend: () => this.emit('end')
        }, { xmlMode: true, decodeEntities: true });
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
        return this.elementStack.length === 0;
    }

    onValue(value) {
        this.emit('result', value);
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

    onOpenTag(name, attrs) {
        name = strRight(name, ':');
        this.elementStack.push(name);
        this.currentContext.onOpenTag(name, attrs);
    }

    onCloseTag() {
        this.elementStack.pop();
        if (this.currentContextPosition === this.currentPosition) {
            this.popContext();
        }
    }

    onText(text) {
        this.bufferText(text);
    }

    /* Writeable stream methods */

    write(chunk, encoding, callback) {
        this.parser.write(chunk, encoding, callback);
    }

    end(chunk, encoding, callback) {
        this.parser.end(chunk, encoding, callback);
    }

}

module.exports = Parser;
