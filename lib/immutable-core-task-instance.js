'use strict'

/* npm modules */
const ImmutableError = require('immutable-error')
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
    y: 'years',
    M: 'months',
    w: 'weeks',
    d: 'days',
    h: 'hours',
    m: 'minutes',
    s: 'seconds',
}
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
    initNew: initNew,
    initRecord: initRecord,
    nextRunTime: nextRunTime,
    run: run,
    runError: runError,
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
            step: 0,
        },
        taskId: this.task.taskId,
        taskName: this.task.name,
    })
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
        // if string is already in mysql format return
        if (time.match(timeRegExp)) {
            return time
        }
        // if string starts with + then use as offset from current time
        else if (time.charAt(0) === '+') {
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
        // otherwise try to parse
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
 * @function run
 *
 * run as many steps as possible for task
 *
 * @returns {Promise}
 */
async function run () {
    // wait for instance to initialize
    await this.promise
}

/**
 * @function runError
 *
 * report error on run
 *
 * @param {Error} error
 */
function runError (error) {

}

/**
 * @function runSuccess
 *
 * report result of run
 *
 * @param {object} result
 */
function runSuccess (result) {
    
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