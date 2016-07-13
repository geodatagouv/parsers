const isPlainObject = require('is-plain-obj');

function isString(candidate) {
    return typeof candidate === 'string';
}

function isArray(candidate) {
    return Array.isArray(candidate);
}

function mapValues(obj, iteratee) {
    if (!isPlainObject(obj)) throw new Error('mapValues must be called with an plain object');
    const result = {};
    Object.keys(obj).forEach(key => result[key] = iteratee(obj[key], key, obj));
    return result;
}

function plainObjectForEach(obj, iteratee) {
    if (!isPlainObject(obj)) throw new Error('plainObjectForEach must be called with an plain object');
    Object.keys(obj).forEach(key => iteratee(obj[key], key, obj));
}

module.exports = { isString, isArray, isPlainObject, mapValues, plainObjectForEach };
