'use strict'

/* npm modules */
const ImmutableAI = require('immutable-ai')
const ImmutableCore = require('immutable-core')
const ImmutableError = require('immutable-error')
const ImmutableGlobal = require('immutable-global')
const _ = require('lodash')
const defined = require('if-defined')

/* application modules */
const ImmutableCoreTaskInstance = require('./immutable-core-task-instance')
const initModule = require('./immutable-core-task/init-module')
const initRecord = require('./immutable-core-task/init-record')
const initRetry = require('./immutable-core-task/init-retry')
const initStep = require('./immutable-core-task/init-step')
const initSteps = require('./immutable-core-task/init-steps')
const sync = require('./immutable-core-task/sync')

/* exports */
module.exports = ImmutableCoreTask

// initialize ImmutableAI with ImmutableCoreTask instance
ImmutableAI.immutableCoreTask(ImmutableCoreTask)

/* globals */

// initialize global data
const immutableGlobal = new ImmutableGlobal('ImmutableCoreTask', {
    tasks: {},
    tasksById: {},
})
// initialize error generator
const immutableError = new ImmutableError({
    class: 'ImmutableCoreTask',
    errorCodes: {
        100: 'arguments object required',
        101: 'name must be string',
        102: 'task already defined',
        103: 'task not defined',
        104: 'ImmutableCoreTask required for orig',
        110: 'method must be function',
        111: 'steps must be array',
        112: 'method must be string',
        113: 'invalid method',
        115: 'retry must be boolean',
        117: 'method not defined',
        118: 'task must have at least one step',
        119: 'async must be boolean',
        120: 'step must be object or string',
        121: 'input must be object',
        122: 'output must be object',
        123: 'input map value must be string',
        124: 'output map value must be string',
        125: 'ImmutableCoreTask must be called with new',
        126: 'retry must be true when check method set',
        127: 'continueOnError must be boolean',
        128: 'taskModel required',
        129: 'ImmutableCoreModelLocal required for taskModel',
        130: 'instanceModel required',
        131: 'ImmutableCoreModelLocal required for instanceModel',
    },
    nameProperty: 'name',
})

/** 
 * @function ImmutableCoreTask
 *
 * instantiate a new ImmutableCoreTask
 *
 * @param {object} args
 *
 * @returns {ImmutableCoreTask}
 *
 * @throws {Error}
 */
function ImmutableCoreTask (args) {
    // must be called with new
    assert(defined(this), 125)
    // require args
    this.assert(_.isPlainObject(args), 100)
    // it record is defined then create version of existing task from record
    if (defined(args.record)) {
        this.initRecord(args)
    }
    // otherwise create new task
    else {
        // create ImmutableCore module and methods
        this.initModule(args)
        // validate each step from steps args
        this.initSteps(args)
    }
}

/* public methods */
ImmutableCoreTask.prototype = {
    assert: assert,
    getMethod: getMethod,
    getSignature: getSignature,
    global: global,
    hasTask: hasTask,
    initModule: initModule,
    initRecord: initRecord,
    initRetry: initRetry,
    initStep: initStep,
    initSteps: initSteps,
    instanceModel: instanceModel,
    taskModel: taskModel,
    new: _new,
    sync: sync,
    task: getTask,
    taskById: getTaskById,
    throw: _throw,
    toJSON: toJSON,
    // class properties
    ImmutableCoreTask: true,
    class: 'ImmutableCoreTask',
}

/* static methods */
ImmutableCoreTask.assert = assert
ImmutableCoreTask.hasTask = hasTask
ImmutableCoreTask.reset = reset
ImmutableCoreTask.task = getTask
ImmutableCoreTask.throw = _throw

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
 * @function getMethod
 *
 * get method from name - throws error if not defined
 *
 * @param {string} method
 *
 * @returns {function}
 *
 * @throws {Error}
 */
function getMethod (method) {
    // return method function
    return ImmutableCore.method(this.getSignature(method))
}

/**
 * @function getSignature
 *
 * get canonical Immutable Core method signature from method string which may
 * use different notations - throws error if not defined
 *
 * @param {string} method
 *
 * @returns {string}
 *
 * @throws {Error}
 */
function getSignature (method) {
    // require string signature for method
    this.assert(typeof method === 'string', 112)
    // split method on dots
    var parts = method.split('.')
    // moduleName.methodName method signature
    var signature
    // if there is only a single part then must be method on task module
    if (parts.length === 1) {
        // add module name to create signature
        signature = `${this.module.meta.name}.${parts[0]}`
    }
    // if there are two parts then must be module signature
    else if (parts.length === 2) {
        signature = method
    }
    // if there are three parts then must be ImmutableAI style
    else if (parts.length === 3) {
        // first part is name space which is capitalized and appended to
        // second part to get module name and third part is method
        signature = `${parts[1]}${_.upperFirst(parts[0])}.${parts[2]}`
    }
    else {
        this.throw(113, `${method} method invalid`)
    }
    // require method to be defined
    this.assert(ImmutableCore.hasMethod(signature), 117, `${signature} method not defined`)
    // return validated signature
    return signature
}

/**
 * @function getTask
 *
 * get task by name - throws error if not defined
 *
 * @param {string} name
 *
 * @returns {ImmutableCoreTask}
 *
 * @throws {Error}
 */
function getTask (name) {
    // get task
    var task = global().tasks[name]
    // throw error if note defined
    assert(defined(task), 103, `${name} task not defined`)
    // return task
    return task
}

/**
 * @function getTaskById
 *
 * get task by id - throws error if not defined
 *
 * @param {string} taskId
 *
 * @returns {Promise<ImmutableCoreTask>}
 *
 * @throws {Error}
 */
async function getTaskById (taskId) {
    // get task
    var task = global().tasksById[taskId]
    // return task if defined
    if (defined(task)) {
        return task
    }
    // if task not defined try to lookup
    var record = await this.taskModel.query({one: true, where: {id: taskId}})
    // require task to be found
    this.assert(defined(record), 103, `${name}#${taskId} task not defined`)
    // create new task from record
    return new ImmutableCoreTask({
        orig: this,
        record: record,
    })
}

/**
 * @function hasTask
 *
 * return true if task defined
 *
 * @param {string} name
 *
 * @returns {boolean}
 */
function hasTask (name) {
    // get task
    var task = global().tasks[name]
    // return true if task is defined
    return defined(task)
}

/**
 * @function global
 *
 * return global data
 *
 * @returns {object}
 */
function global () {
    return immutableGlobal.data
}

/** 
 * @function instanceModel
 *
 * get/set task instnace model
 *
 * @param {ImmutableCoreModel|undefined} model
 *
 * @return {ImmutableCoreModel}
 *
 * @throws {Error}
 */
function instanceModel (model) {
    // set model if defined
    if (defined(model)) {
        // validate model
        this.assert(model.ImmutableCoreModelLocal, 131)
        // set model
        this._instanceModel = model
    }
    // require model
    this.assert(defined(this._instanceModel), 130)
    // return model
    return this._instanceModel
}

/** 
 * @function taskModel
 *
 * get/set task model
 *
 * @param {ImmutableCoreModel|undefined} model
 *
 * @return {ImmutableCoreModel}
 *
 * @throws {Error}
 */
function taskModel (model) {
    // set model if defined
    if (defined(model)) {
        // validate model
        this.assert(model.ImmutableCoreModelLocal, 129)
        // set model
        this._taskModel = model
    }
    // require model
    this.assert(defined(this._taskModel), 128)
    // return model
    return this._taskModel
}

/**
 * @function _new
 *
 * create new ImmutableCoreComponentInstance
 *
 * @param {object} args
 *
 * @returns {Promise<ImmutableCoreComponentInstance>}
 */
function _new (args) {
    // instantiate new instance
    var instance = new ImmutableCoreTaskInstance({
        data: args,
        task: this,
    })
    // wait for initialize promise to resolve then resolve with instance
    return instance.promise.then(() => instance)
}

/**
 * @function reset
 *
 * reset global data
 */
function reset () {
    immutableGlobal.reset()
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

/**
 * @function toJSON
 *
 * return object for json encoding
 *
 * @returns {object}
 */
function toJSON () {
    return _.pick(this, ['data', 'name', 'steps'])
}