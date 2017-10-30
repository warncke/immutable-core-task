'use strict'

/* npm modules */
const ImmutableError = require('immutable-error')
const ImmutableGlobal = require('immutable-global')
const Promise = require('bluebird')
const _ = require('lodash')
const changeCase = require('change-case')
const defined = require('if-defined')
const moment = require('moment')

/* exports */
module.exports = ImmutableCoreTaskInstance

/* globals */

// allowed units for time duration
const durationUnits = {
    M: 'months',
    d: 'days',
    h: 'hours',
    m: 'minutes',
    s: 'seconds',
    w: 'weeks',
    y: 'years',
}
// regex to match duration string
const durationRegExp = /^(\d+[Mdhmswy])+$/
// format for timestamp
const timeFormat = 'YYYY-MM-DD HH:mm:ss'
// regex to match timestamp
const timeRegExp = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/

// initialize error generator
const immutableError = new ImmutableError({
    class: 'ImmutableCoreTaskInstance',
    errorCodes: {
        100: 'args object required',
        101: 'task or record required',
        110: 'data must be object',
        111: 'invalid time type',
        112: 'invalid time',
        113: 'task not defined',
        200: 'step not defined',
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
    this.assert(_.isPlainObject(args), 100)
    // require task or record
    this.assert(_.isObject(args.task) && args.task.ImmutableCoreTask || _.isObject(args.record) && args.record.ImmutableCoreModelRecord, 101)
    // store promise that will be resolved when instance initialized
    this.promise = defined(args.record)
        // if record is defined initialize from existing instance record
        ? this.initRecord(args)
        // otherwise create new instance
        : this.initNew(args)

    this.promise.catch(err => console.error(err.stack))
}

/* public methods */
ImmutableCoreTaskInstance.prototype = {
    assert: assert,
    getInput: getInput,
    getOutput: getOutput,
    initNew: initNew,
    initRecord: initRecord,
    nextRunTime: nextRunTime,
    nextStep: nextStep,
    nextStepForward: nextStepForward,
    nextStepForwardError: nextStepForwardError,
    nextStepReverse: nextStepReverse,
    nextStepReverseError: nextStepReverseError,
    run: run,
    runError: runError,
    runStep: runStep,
    runSuccess: runSuccess,
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
 * @function getInput
 *
 * apply input map to data
 *
 * @param {object} data
 * @param {object} map
 *
 * @returns {object}
 */
function getInput (data, map) {
    // input to build
    var input = {}
    // get input from data using map
    _.each(map, (inputKey, dataKey) => {
        _.set(input, inputKey, _.get(data, dataKey))
    })
    // return input
    return input
}

/**
 * @function getOutput
 *
 * apply output map to result
 *
 * @param {object} result
 * @param {object} map
 *
 * @returns {object}
 */
function getOutput (result, map) {
    // output to build
    var output = {}
    // get output from data using map
    _.each(map, (outputKey, resultKey) => {
        _.set(output, outputKey, _.get(result, resultKey))
    })
    // return output
    return output
}

/**
 * @function initNew
 *
 * create new instance record
 *
 * @param {object} args
 */
async function initNew (args) {
    // set task
    this.task = args.task
    // get instance model - throws error if not set
    var model = this.task.instanceModel()
    // get data from args
    var data = defined(args.data) ? args.data : {}
    // require valid data
    this.assert(_.isPlainObject(data), 110)
    // get nextRunTime from args or the current time
    var nextRunTime = this.nextRunTime(args.nextRunTime)
    // sync task if taskId not set
    if (!defined(this.task.taskId)) {
        await this.task.sync()
    }
    // create new instance record
    this.record = await model.create({
        data: data,
        nextRunTime: nextRunTime,
        status: {
            stepNum: 0,
        },
        taskId: this.task.taskId,
        taskName: this.task.name,
    })
    // alias data and status to record
    this.data = this.record.data.data
    this.status = this.record.data.status
}

/**
 * @function initRecord
 *
 * initialize from existing instance record
 *
 * @param {object} args
 */
async function initRecord (args) {
    // store record
    this.record = args.record
    // get task properties
    var taskId = this.record.data.taskId
    var taskName = this.record.data.taskName
    // get tasks register from global
    var tasks = ImmutableGlobal.global('ImmutableCoreTask').data.tasks
    // get task by name
    this.task = tasks[taskName]
    // require task to be defined
    this.assert(defined(this.task), 113, `${taskName} task not defined`)
    // if taskId doesnt match need to load correct task
    if (taskId !== this.task.taskId) {
        this.task = await this.task.taskById(taskId)
    }
    // alias data and status to record
    this.data = this.record.data.data
    this.status = this.record.data.status
}

/**
 * @function nextRunTime
 *
 * get next run time string from string time, duration, moment, Date or current
 *
 * @param {object|string|undefined} time
 *
 * @returns {string}
 *
 * @throws {Error}
 */
function nextRunTime (time) {
    // if not time passed in then use current time
    if (!defined(time)) {
        return moment.utc().format(timeFormat)
    }
    // time is a string
    else if (typeof time === 'string') {
        // string is already in correct format
        if (time.match(timeRegExp)) {
            return time
        }
        // string is duration
        else if (time.match(durationRegExp)) {
            // use current time as starting point
            var currentTime = moment.utc()
            // get duration parts
            var parts = time.split(/(\d+)/)
            // get length for loop
            var len = parts.length - 1
            // add each time duration
            for (var i=1; i < len; i+=2) {
                var duration = parts[i]
                var unit = parts[i+1]
                // require valid unit
                this.assert(defined(durationUnits[unit]), 112, `invalid time ${time}`)
                // add duration to current time
                currentTime.add(duration, unit)
            }
            // format
            return currentTime.format(timeFormat)
        }
        // try to parse
        else {
            // try to parse time string
            var date = new Date(time)
            // throw error on invalid date
            this.assert(date.toString() !== 'Invalid Date', 112, `invalid time ${time}`)
            // format
            return moment.utc(date).format(timeFormat)
        }
    }
    // time is object
    else if (typeof time === 'object') {
        return moment.utc(time).format(timeFormat)
    }
    else {
        this.throw(111, `invalid type for time ${typeof time}`)
    }
}

/**
 * @function nextStep
 *
 * get next step to run
 *
 * @returns {object}
 */
function nextStep () {
    // do not run if flag has been set to false
    if (this.runNextStep === false) {
        return
    }
    // get current step number from status
    var stepNum = this.status.stepNum
    // get step info from task
    var step = this.task.steps[stepNum]
    // require step
    this.assert(defined(step), 200, `step ${stepNum} not defined`)
    // working in reverse
    if (this.status.reverse) {
        return this.status.error ? this.nextStepReverseError(step) : this.nextStepReverse(step)
    }
    // working forward
    else {
        return this.status.error ? this.nextStepForwardError(step) : this.nextStepForward(step)
    }
}

/**
 * @function nextStepForward
 *
 * get next step to run
 *
 * @param {object} step
 *
 * @returns {object}
 */
function nextStepForward (step) {
    // set status to running
    this.status.running = true
    // increment try count if not defined
    if (defined(this.status.try)) {
        this.status.try++
    }
    // set try to 1
    else {
        this.status.try = 1
    }
    // in input map is defined modify args
    var args = defined(step.input) ? this.getInput(this.data, step.input) : this.data

    return step
}

/**
 * @function nextStepForwardError
 *
 * get next step to run
 *
 * @param {object} step
 *
 * @returns {object}
 */
function nextStepForwardError (step) {

}

/**
 * @function nextStepReverse
 *
 * get next step to run
 *
 * @param {object} step
 *
 * @returns {object}
 */
function nextStepReverse (step) {

}

/**
 * @function nextStepReverseError
 *
 * get next step to run
 *
 * @param {object} step
 *
 * @returns {object}
 */
function nextStepReverseError (step) {

}

/**
 * @function run
 *
 * run as many steps as possible for task
 *
 * @returns {Promise}
 */
async function run () {
    // wait for instance to initialize
    await this.promise
    // step to process
    var step
    // run in loop until nothing let to process
    for (true; step = this.nextStep(); defined(step)) {
        try {
            // run step method
            var result = await this.runStep(step)
            // process result if output map defined
            if (defined(step.output)) {
                result = this.getOutput(result, step.output)
            }
            // handle success
            await this.runSuccess(result)
        }
        catch (err) {
            // handle error
            await this.runError(err)
        }
    }
}

/**
 * @function runError
 *
 * report error on run
 *
 * @param {Error} error
 */
async function runError (error) {
    console.log(error)
}

/**
 * @function runSuccess
 *
 * execute step
 *
 * @param {object} step
 *
 * @returns {object}
 */
async function runStep (step) {
    // get method - throws error if not found
    var method = this.task.getMethod(step.method)
    // get args - apply input map if defined
    var args = defined(step.input) ? this.getInput(this.data, step.input) : this.data
    // run method
    var result = await (method)(args)
    // apply output map if defined
    if (defined(step.output)) {
        result = this.getOutput(result, step.output)
    }
    // resolve with method result
    return result
}

/**
 * @function runSuccess
 *
 * report result of run
 *
 * @param {object} result
 */
async function runSuccess (result) {
    // merge result to data
    _.merge(this.data, result)
    // clear running flag
    this.status.running = undefined
    // clear try count
    this.status.try = undefined
    // all steps complete
    if (this.task.numSteps === this.status.stepNum + 1) {
        // clear status
        this.record.data.status = this.status = undefined
        // clear nextRunTime
        this.record.data.nextRunTime = undefined
        // set complete flag
        this.record.data.complete = true
        // set success flag
        this.record.data.success = true
        // do not run next step
        this.runNextStep = false
    }
    // still more steps to process
    else {
        // increment step number to run next
        this.status.stepNum++
    }

    // if not running next step then need to save record
    if (this.runNextStep === false) {
        this.record = await this.record.updateMeta({
            data: this.record.data,
            merge: false,
        })
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