'use strict'

/* npm modules */
const ImmutableError = require('immutable-error')
const Promise = require('bluebird')
const _ = require('lodash')
const changeCase = require('change-case')
const defined = require('if-defined')

/* exports */
module.exports = ImmutableCoreTaskInstance

/* globals */

// initialize error generator
const immutableError = new ImmutableError({
    class: 'ImmutableCoreTaskInstance',
    errorCodes: {
        100: 'arguments object required',
        101: 'task required',
        110: 'data must be object',
    },
    nameProperty: 'task.name',
})

/** 
 * @function ImmutableCoreTaskInstance
 *
 * instantiate a new ImmutableCoreTaskInstance
 *
 * @param {object} args
 *
 * @returns {ImmutableCoreTaskInstance}
 *
 * @throws {Error}
 */
function ImmutableCoreTaskInstance (args) {
    // require args
    this.assert(typeof args === 'object' && args, 100)
    // get task
    var task = args.task
    // require task
    this.assert(typeof task === 'object' && task && task.ImmutableCoreTask, 101)
    // set task
    this.task = task
    // initialize data to empty object
    this.data = {}
    // if id is passed then initialize existing instance
    if (defined(args.id)) {
        // set id from args
        this.id = args.id
    }
    // otherwise create new instance
    else {
        // set default id which may be overwritten by new
        this.id = this.task.name
        // run new method setting data and id from response
        // this.promise will be resolved by new
        this.initNew(args)
    }
}

/* public methods */
ImmutableCoreTaskInstance.prototype = {
    assert: assert,
    initNew: initNew,
    throw: _throw,
    // class properties
    ImmutableCoreTaskInstance: true,
    class: 'ImmutableCoreTaskInstance',
}

/* static methods */
ImmutableCoreTaskInstance.assert = assert
ImmutableCoreTaskInstance.throw = _throw

/**
 * @function assert
 *
 * assert that value is true - throw error if false
 *
 * @param {boolean} assert
 * @param {number} code
 * @param {string} customMessage
 * @param {Error} original
 * @param {object} data
 *
 * @throws {Error}
 */
function assert (assert, code, customMessage, original, data) {
    return immutableError.assert(assert, this, code, customMessage, original, data)
}

/**
 * @function initNew
 *
 * run task module new method if defined
 *
 * @param {object} args
 */
function initNew (args) {
    // get module
    var module = this.task.module
    // if module has new method run it
    if (module.new) {
        // call new method with original new args
        this.promise = module.new(args.args).then(res => {
            // if new returns undefined do not set
            if (!defined(res)) {
                return
            }
            // require data to be object
            this.assert(typeof res === 'object' && res, 110)
            // if data is set then use it
            if (defined(res.data)) {
                // require data to be object
                this.assert(typeof res.data === 'object' && res.data, 110)
                // set task data to data returned by new method
                this.data = res.data
            }
            // if id set set it data use it
            if (defined(res.id)) {
                this.id = res.id
            }
        })
    }
    // otherwise set resolved promise
    else {
        // use any args for data
        _.merge(this.data, args.args)
        // set init promise as resolved
        this.promise = Promise.resolve()
    }
}

/**
 * @function _throw
 *
 * throw an error
 *
 * @param {number} code
 * @param {string} customMessage
 * @param {Error} original
 * @param {object} data
 *
 * @throws {Error}
 */
function _throw (code, customMessage, original, data) {
    immutableError.throw(this, code, customMessage, original, data)
}