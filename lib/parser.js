'use strict';

const collectionIncludes = require('lodash/collection/includes');
const collectionForEach = require('lodash/collection/forEach');
const isObject = require('lodash/lang/isObject');
const EventEmitter = require('events').EventEmitter;
const XmlParser = require('htmlparser2').Parser;
const consolidate = require('./consolidation').consolidateDefinition;

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
        this.element = options.element;
        this.property = options.property;
        this.parentContext = options.parentContext;
        this.acceptableChildren = options.acceptableChildren;

        if (['contentChild', 'child', 'propertyType'].indexOf(this.type) > -1) {
            this.definition = this.parser.getElementDefinition(this.element);
            if (this.definition.type === 'object') {
                this.internalValue = {};
            }
        }

        if (this.type === 'property') {
            this.definition = this.parser.getPropertyDefinition(this.element, this.property);
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

    onOpenTag(name, attributes) {
        const childElementType = this.identifyChildElement(name);
        if (!childElementType) return;

        this.parser.toggleTextCapture(false);
        this.currentCaptureMode = childElementType;

        if (['child', 'property'].indexOf(childElementType) > -1) {
            this.currentProperty = name;
        }

        const isProperty = childElementType === 'property';

        this.parser.pushContext({
            type: childElementType,
            element: isProperty ? this.element: name,
            property: isProperty ? name : null,
            parentContext: this,
            attributes
        });
    }

    onContentChild(elementName, value) {
        if (!value || (isObject(value) && Object.keys(value).length === 0)) return;
        if (! this.internalValue.children) this.internalValue.children = [];
        value['@elementType'] = elementName;
        this.internalValue.children.push(value);
    }

    onPropertyValue(property, value) {
        if (!value || (isObject(value) && Object.keys(value).length === 0)) return;
        const propertyDefinition = this.parser.getPropertyDefinition(this.element, property);
        const propertyName = propertyDefinition.renameTo ? propertyDefinition.renameTo : property;
        if (propertyDefinition.array) {
            if (! this.internalValue[propertyName]) {
                this.internalValue[propertyName] = [value];
            } else {
                this.internalValue[propertyName].push(value);
            }
        } else {
            this.internalValue[propertyName] = value;
        }
    }

    onChildElement(property, value) {
        if (!value || (isObject(value) && Object.keys(value).length === 0)) return;
        const propertyDefinition = this.parser.getChildElementPropertyDefinition(this.element, property);
        const propertyName = propertyDefinition.renameTo ? propertyDefinition.renameTo : property;
        if (propertyDefinition.array) {
            if (! this.internalValue[propertyName]) {
                this.internalValue[propertyName] = [value];
            } else {
                this.internalValue[propertyName].push(value);
            }
        } else {
            this.internalValue[propertyName] = value;
        }
    }

    onValue(value) {
        this.internalValue = value;
    }

    onSubContextClose(elementName, value) {
        if (this.currentCaptureMode === 'property') {
            this.onPropertyValue(this.currentProperty, value);
        }
        if (this.currentCaptureMode === 'contentChild') {
            if (this.type === 'root') return this.parser.onValue(value);
            this.onContentChild(elementName, value);
        }
        if (this.currentCaptureMode === 'child') {
            this.onChildElement(this.currentProperty, value);
        }
        if (this.currentCaptureMode === 'propertyType') {
            this.onValue(value);
        }
        this.currentCaptureMode = null;
    }

    close() {
        if (this.parser.capturingText && ! this.internalValue) {
            this.internalValue = this.parser.flushTextBuffer();
        }
        if (this.parentContext !== this.parser) {
            this.parentContext.onSubContextClose(this.element, this.internalValue);
        }
    }

}

class Parser extends EventEmitter {

    constructor(rootElement, definition) {
        if (!definition) throw new Error('Definition is required');
        super();
        this.definition = consolidate(definition);

        this.elementStack = [];
        this.contextStack = [];

        this.pushContext({
            type: 'root',
            acceptableChildren: [rootElement],
            parentContext: this
        });

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
            this.currentContext.close();
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

    /* Cleanup */

    clean() {
        this.removeAllListeners();
    }

}

module.exports = Parser;
