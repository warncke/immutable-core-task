'use strict'

/* npm modules */
const ImmutableCore = require('immutable-core')
const _ = require('lodash')
const defined = require('if-defined')

/* exports */
module.exports = initModule

/**
 * @function initModule
 *
 * create ImmutableCore module and methods
 *
 * @param {object} args
 *
 * @throws {Error}
 */
function initModule (args) {
    // require string name
    this.assert(typeof args.name === 'string' && args.name.length, 101)
    // component must not already be defined
    this.assert(!defined(this.global().tasks[args.name]), 102, `${args.name} task already defined`)
    // store name
    this.name = args.name
    // create module name from string with `Task` appended
    this.moduleName = `${this.name}Task`
    // create new module - throws error if defined
    this.module = ImmutableCore.module(this.moduleName, {})
    // add info to module meta
    this.module.meta.class = 'ImmutableCoreTask'
    this.module.meta.instance = this
    // add component to global register
    this.global().tasks[this.name] = this
    // add any methods to module
    _.each(args.methods, (method, methodName) => {
        // require function
        this.assert(typeof method === 'function', 110, `${methodName} method must be function`)
        // create module method
        this.module.method(methodName, method)
    })
    // create default data for task
    this.data = {}
    // add any data from args
    _.merge(this.data, args.data)
    // if instance model is passed in args set
    if (defined(args.instanceModel)) {
        this.instanceModel(args.instanceModel)
    }
    // if task model is passed in args set
    if (defined(args.taskModel)) {
        this.taskModel(args.taskModel)
    }
}