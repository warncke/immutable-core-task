'use strict'

/* npm modules */
const ImmutableError = require('immutable-error')
const ImmutableGlobal = require('immutable-global')
const Promise = require('bluebird')
const _ = require('lodash')
const changeCase = require('change-case')
const debug = require('debug')('immutable-core-task')
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
// list of retry durations
const autoRetryDurations = ['5s', '1m', '5m', '30m', '3hr', '12hr', '24hr', '24hr']
// auto max retry
const autoMaxRetry = autoRetryDurations.length

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
        201: 'invalid retry type',
        202: 'run loop',
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
    completeError: completeError,
    completeFailure: completeFailure,
    completeSuccess: completeSuccess,
    getInput: getInput,
    getOutput: getOutput,
    initNew: initNew,
    initRecord: initRecord,
    nextRunTime: nextRunTime,
    nextStep: nextStep,
    nextStepCheck: nextStepCheck,
    nextStepCheckError: nextStepCheckError,
    nextStepError: nextStepError,
    nextStepErrorCheck: nextStepErrorCheck,
    nextStepErrorCheckError: nextStepErrorCheckError,
    nextStepErrorError: nextStepErrorError,
    nextStepMethod: nextStepMethod,
    nextStepMethodError: nextStepMethodError,
    nextStepMethodName: nextStepMethodName,
    nextStepNone: nextStepNone,
    nextStepReverse: nextStepReverse,
    nextStepReverseCheck: nextStepReverseCheck,
    nextStepReverseCheckError: nextStepReverseCheckError,
    nextStepReverseError: nextStepReverseError,
    reload: reload,
    retry: retry,
    retryAuto: retryAuto,
    run: run,
    runMethodName: runMethodName,
    runStepCheck: runStepCheck,
    runStepError: runStepError,
    runStepErrorCheck: runStepErrorCheck,
    runStepErrorHandler: runStepErrorHandler,
    runStepMethod: runStepMethod,
    runStepReverse: runStepReverse,
    runStepReverseCheck: runStepReverseCheck,
    save: save,
    setStep: setStep,
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
 * @function completeError
 *
 * complete task with failure
 *
 * @returns {Promise<undefined>}
 */
async function completeError () {
    debug('completeError')
    // if task has reverse method(s) and completeError flag not already set
    // then run reverse methods before complete
    if (this.task.hasReverse && !this.status.reverse) {
        // set flag to run in reverse
        this.status.reverse = true
        // store final success value
        this.status.successOrig = true
        // run reverse manually
        await this.nextStepReverse()
    }
    // complete task
    else {
        // clear local status but leave on record to save
        this.status = undefined
        // clear nextRunTime
        this.record.data.nextRunTime = undefined
        // set complete flag
        this.record.data.complete = true
        // set success flag
        this.record.data.success = true
        // save
        await this.save()
    }
}

/**
 * @function completeFailure
 *
 * complete task with failure
 *
 * @returns {Promise<undefined>}
 */
async function completeFailure () {
    debug('completeFailure')
    // if task has reverse method(s) and neither the completeError or
    // completeFailure flags are set then run reverse methods before complete
    if (this.task.hasReverse && !this.status.reverse) {
        // set flag to run in reverse
        this.status.reverse = true
        // store final success value
        this.status.successOrig = false
        // run reverse manually
        await this.nextStepReverse()
    }
    else {
        // clear local status but leave on record to save
        this.status = undefined
        // clear nextRunTime
        this.record.data.nextRunTime = undefined
        // set complete flag
        this.record.data.complete = true
        // set success flag
        this.record.data.success = false
        // save
        await this.save()
    }
}

/**
 * @function completeSuccess
 *
 * complete task with success
 *
 * @returns {Promise<undefined>}
 */
async function completeSuccess () {
    // clear status both locally and on record
    this.status = this.record.data.status = undefined
    // clear nextRunTime
    this.record.data.nextRunTime = undefined
    // set complete flag
    this.record.data.complete = true
    // set success flag
    this.record.data.success = true
    // save
    await this.save()
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
    // always include session
    input.session = data.session
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
        taskId: this.task.taskId,
        taskName: this.task.name,
    })
    // alias data and status to record
    this.data = this.record.data.data
    this.status = this.record.data.status
    this.lastStepNum = -1
    this.lastSubStep = ''
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
    // load task if not already defined
    if (!defined(this.task)) {
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
    }
    // alias data and status to record
    this.data = this.record.data.data
    this.status = this.record.data.status
    this.lastStepNum = -1
    this.lastSubStep = ''
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
 */
async function nextStep () {
    // debug status
    debug('nextStep', this.status)
    // create status object to track execution status
    if (!defined(this.status)) {
        this.status = this.record.data.status = {}
    }
    // create try object to track number of retries for sub-steps
    if (!defined(this.status.try)) {
        this.status.try = {}
    }
    // call method to determine next step
    await this[this.nextStepMethodName()]()
}

/**
 * @function nextStepCheck
 *
 * get next step to run
 *
 * @returns {Promise<undefined>}
 */
async function nextStepCheck () {
    // capture check result
    var checkResult = this.status.checkResult
    // clear check result from status
    this.status.checkResult = undefined
    // clear try count after success
    this.status.try.check = undefined
    // if check resolved with value then method complete
    if (checkResult) {
        // treat this as method success
        await this.nextStepMethod()
    }
    // otherwise retry method
    else {
        // run method sub-step
        this.status.subStep = 'method'
        // increment try count
        this.status.try.method++
    }
}

/**
 * @function nextStepCheckError
 *
 * get next step to run
 *
 * @returns {Promise<undefined>}
 */
async function nextStepCheckError () {
    // get current step
    var step = this.status.step
    // if retry was previously scheduled then run now
    if (this.status.retry) {
        // clear retry flag
        this.status.retry = undefined
        // clear check error
        this.status.error.check = undefined
        // increment try count
        this.status.try.check++
    }
    // retry if possible
    else if (this.retry(step.check.retry)) {
        // save instance to re-run after timeout
        await this.save()
        // clear status to stop current run
        this.status = undefined
    }
    // if step has un-handled error the task fails
    else {
        await this.completeFailure()
    }
}

/**
 * @function nextStepError
 *
 * get next step to run
 *
 * @returns {Promise<undefined>}
 */
async function nextStepError () {
    // complete task with handled-error success status
    await this.completeError()
}

/**
 * @function nextStepErrorCheck
 *
 * get next step to run
 *
 * @returns {Promise<undefined>}
 */
async function nextStepErrorCheck () {
    // capture check result
    var errorCheckResult = this.status.errorCheckResult
    // clear check result from status
    this.status.errorCheckResult = undefined
    // clear try count after success
    this.status.try.errorCheck = undefined
    // if check resolved with value then error complete
    if (errorCheckResult) {
        // treat this as error success
        await this.nextStepError()
    }
    // otherwise retry error
    else {
        // run error sub-step
        this.status.subStep = 'error'
        // increment try count
        this.status.try.error++
    }
}

/**
 * @function nextStepErrorCheckError
 *
 * get next step to run
 *
 * @returns {Promise<undefined>}
 */
async function nextStepErrorCheckError () {
    // get current step
    var step = this.status.step
    // if retry was previously scheduled then run now
    if (this.status.retry) {
        // clear retry flag
        this.status.retry = undefined
        // clear check error
        this.status.error.errorCheck = undefined
        // increment try count
        this.status.try.errorCheck++
    }
    // retry if possible
    else if (this.retry(step.error.check.retry)) {
        // save instance to re-run after timeout
        await this.save()
        // clear status to stop current run
        this.status = undefined
    }
    // if step has un-handled error the task fails
    else {
        await this.completeFailure()
    }
}

/**
 * @function nextStepErrorCheckError
 *
 * get next step to run
 *
 * @returns {Promise<undefined>}
 */
async function nextStepErrorError () {
    // get current step
    var step = this.status.step
    // if retry was previously scheduled then run now
    if (this.status.retry) {
        // clear retry flag
        this.status.retry = undefined
        // clear error
        this.status.error = undefined
        // if error has check method then run before error handler
        if (defined(step.error.check)) {
            // run the error check sub-step
            this.status.subStep = 'errorCheck'
            // start try count at 0
            this.status.try.errorCheck = 0
        }
        // otherwise retry error handler
        else {
            // increment try count
            this.status.try.error++
        }
    }
    // retry if possible
    else if (this.retry(step.error.retry)) {
        // save instance to re-run after timeout
        await this.save()
        // clear status to stop current run
        this.status = undefined
    }
    // if step has un-handled error the task fails
    else {
        // if errors are being ignored then continue to next step
        if (step.ignoreError) {
            await this.nextStepMethod()
        }
        // complete task with failure
        else {
            await this.completeFailure()
        }
    }
}

/**
 * @function nextStepMethod
 *
 * after method success run next step
 *
 * @returns {Promise<undefined>}
 */
async function nextStepMethod () {
    // all steps completed
    if (this.task.numSteps === this.status.stepNum + 1) {
        // complete task and save
        await this.completeSuccess()
    }
    // go to next step
    else {
        // clear any errors
        this.status.error = undefined
        // reset try counters to 0
        this.status.try = {method: 0}
        // go to next step after completing method with success
        this.status.stepNum++
        // set step to process from step number
        this.setStep()
        // start with method sub-step
        this.status.subStep = 'method'
    }
}

/**
 * @function nextStepMethodError
 *
 * after method error either retry, run error method if defined, run reverse
 * if any reverse methods, or complete with error
 *
 * @returns {Promise<undefined>}
 */
async function nextStepMethodError () {
    // get current step
    var step = this.status.step
    // if retry was previously scheduled then run now
    if (this.status.retry) {
        // clear retry flag
        this.status.retry = undefined
        // clear error
        this.status.error = undefined
        // if step has check sub-step then run that before method
        if (defined(step.check)) {
            // run the check sub-step
            this.status.subStep = 'check'
            // start the check try count at 0
            this.status.try.check = 0
        }
        // otherwise retry method
        else {
            // increment try count
            this.status.try.method++
        }
    }
    // retry if possible
    else if (this.retry(step.retry)) {
        // save instance to re-run after timeout
        await this.save()
        // clear status to stop current run
        this.status = undefined
    }
    // step has error handler
    else if (defined(step.error)) {
        // first try of error handler follows method error
        this.status.try.error = 0
        // run error sub-step
        this.status.subStep = 'error'
    }
    // error is not handled
    else {
        // if errors are being ignored then continue to next step
        if (step.ignoreError) {
            await this.nextStepMethod()
        }
        // complete task with failure
        else {
            await this.completeFailure()
        }
    }
}

/**
 * @function nextStepMethodName
 *
 * get name for method that determines next step. method name will be:
 * nextStep<lastStepName> with Error appended if last step had error.
 *
 * @returns {string}
 */
function nextStepMethodName () {
    // get last sub step from status - may be undefined
    var lastSubStep = this.status.subStep
    // if subStep is not defined default to none
    if (!defined(lastSubStep)) {
        lastSubStep = 'none'
    }
    // check if step had error
    var error = defined(this.status.error) && defined(this.status.error[lastSubStep])
    // build method name from the last step and whether or not it had an error
    var nextStepMethodName = `nextStep${_.upperFirst(lastSubStep)}${error ? 'Error' : ''}`
    // debug method name
    debug('nextStepMethodName', nextStepMethodName)
    // return method name
    return nextStepMethodName
}

/**
 * @function nextStepNone
 *
 * when no previous steps always run method sub-step of first step
 *
 * @returns {Promise<undefined>}
 */
async function nextStepNone () {
    // start with step 0
    this.status.stepNum = 0
    // start with try 0
    this.status.try.method = 0
    // set step to process from step number
    this.setStep()
    // start with method sub-step
    this.status.subStep = 'method'
}

/**
 * @function nextStepReverse
 *
 * get next step to run
 *
 * @returns {Promise<undefined>}
 */
async function nextStepReverse () {
    // find next step with a reverse method - current step had error
    // so do not run reverse for it
    for (this.status.stepNum--; this.status.stepNum >= 0; this.status.stepNum--) {
        // if step has reverse run it
        if (this.task.steps[this.status.stepNum].reverse) {
            break
        }
    }
    // run reverse step
    if (this.status.stepNum >= 0) {
        // set current step from step num
        this.setStep()
        // reset try counters to 0
        this.status.try = {reverse: 0}
        // run reverse sub-step
        this.status.subStep = 'reverse'
    }
    // complete when all reverse steps done
    else {
        // call correct complete method depending on what was originally called
        await this.status.successOrig ? this.completeError() : this.completeFailure()
    }
}

/**
 * @function nextStepReverseCheck
 *
 * get next step to run
 *
 * @returns {Promise<undefined>}
 */
async function nextStepReverseCheck () {
    // capture check result
    var reverseCheckResult = this.status.reverseCheckResult
    // clear check result from status
    this.status.reverseCheckResult = undefined
    // clear try count after success
    this.status.try.reverseCheck = undefined
    // if check resolved with value then check complete
    if (reverseCheckResult) {
        // treat this as reverse success
        await this.nextStepReverse()
    }
    // retry reverse
    else {
        // run reverse sub-step
        this.status.subStep = 'reverse'
        // increment try count
        this.status.try.reverse++
    }
}

/**
 * @function nextStepReverseCheckError
 *
 * get next step to run
 *
 * @returns {Promise<undefined>}
 */
async function nextStepReverseCheckError () {
    // get current step
    var step = this.status.step
    // if retry was previously scheduled then run now
    if (this.status.retry) {
        // clear retry flag
        this.status.retry = undefined
        // clear error
        this.status.error.reverseCheck = undefined
        // increment try count
        this.status.try.reverseCheck++
    }
    // retry if possible
    else if (this.retry(step.reverse.check.retry)) {
        // save instance to re-run after timeout
        await this.save()
        // clear status to stop current run
        this.status = undefined
    }
    // if step has un-handled error the task fails
    else {
        await this.completeFailure()
    }
}

/**
 * @function nextStepReverseError
 *
 * get next step to run
 *
 * @returns {Promise<undefined>}
 */
async function nextStepReverseError () {
    // get current step
    var step = this.status.step
    // if retry was previously scheduled then run now
    if (this.status.retry) {
        // clear retry flag
        this.status.retry = undefined
        // clear error
        this.status.error = undefined
        // if step has check sub-step then run that before method
        if (defined(step.reverse.check)) {
            // run the check sub-step
            this.status.subStep = 'reverseCheck'
            // start the check try count at 0
            this.status.try.reverseCheck = 0
        }
        // otherwise retry method
        else {
            // increment try count
            this.status.try.reverse++
        }
    }
    // retry if possible
    else if (this.retry(step.reverse.retry)) {
        // save instance to re-run after timeout
        await this.save()
        // clear status to stop current run
        this.status = undefined
    }
    // if step has un-handled error the task fails
    else {
        await this.completeFailure()
    }
}

/**
 * @function reload
 *
 * reset instance data to current record instance
 *
 * @returns {Promise<undefined>}
 */
async function reload () {
    // get current instance of record
    var record = await this.task.instanceModel().query({
        current: true,
        one: true,
        where: {id: this.record.id},
    })
    // re-initialize instance from record
    this.initRecord({record: record})
}

/**
 * @function retry
 *
 * return true if there should be retry on error
 *
 * @param {object} retry
 *
 * @returns {boolean}
 */
function retry (retry) {
    // if step does not have retry spec then no retry
    if (!defined(retry)) {
        return false
    }
    // if retry type is auto then system decides wether or not to retry
    if (retry.type === 'auto') {
        return this.retryAuto(retry)
    }
    // no other retry types supported
    else {
        this.throw(201, `invalid retry type ${retry.type}`)
    }
}

/**
 * @function retryAuto
 *
 * decide whether or not to retry.
 *
 * in the future this should look at the type of error and always retry on
 * network errors, never retry on duplicate key errors or code errors that
 * won't change, and then optimistically retry on errors without specific
 * rules.
 *
 * currently the behavior is to always retry on a fixed schedule.
 *
 * @param {object} retry
 *
 * @returns {boolean}
 */
function retryAuto (retry) {
    // get try count for sub-step
    var subStepTry = this.status.try[this.status.subStep]
    // do not retry if limit exceeded
    if (subStepTry > autoMaxRetry) {
        return false
    }
    // get retry duration based on which try this is
    var retryDuration = autoRetryDurations[subStepTry]
    // set the retry flag
    this.status.retry = true
    // set next run time for duration
    this.record.data.nextRunTime = this.nextRunTime(retryDuration)
    // set complete flag to false since running started by not done
    this.record.data.complete = false
    // return true to save retry status
    return true
}


/**
 * @function run
 *
 * run as many steps as possible for task
 *
 * @returns {Promise<undefined>}
 */
async function run () {
    // debug run start
    debug('run')
    // wait for instance to initialize
    await this.promise
    // run in loop until nothing left to process
    for (await this.nextStep(); defined(this.status) && defined(this.status.step); await this.nextStep()) {
        // throw error if running the same step twice in a row
        this.assert(this.lastStepNum !== this.status.stepNum || this.lastSubStep !== this.status.subStep, 202)
        // store step num and sub-step
        this.lastStepNum = this.status.stepNum
        this.lastSubStep = this.status.subStep
        // debug
        debug('running', this.status.stepNum, this.status.subStep)
        // set status to running
        this.status.running = true
        // save before running
        await this.save()
        // run step method
        try {
            await this[this.runMethodName()]()
        }
        catch (err) {
            await this.runStepErrorHandler(err)
        }
        // clear running flag
        this.status.running = undefined
    }
}

/**
 * @function runMethodName
 *
 * get name of run method for sub-step
 *
 * @returns {string}
 */
function runMethodName () {
    return `runStep${_.upperFirst(this.status.subStep)}`
}

/**
 * @function runStepCheck
 *
 * run check sub-step
 *
 * @returns {Promise<undefined>}
 */
async function runStepCheck () {
    // get step
    var step = this.status.step
    // get check sub-step
    var subStep = step.check
    // get method - throws error if not found
    var method = this.task.getMethod(subStep.method)
    // method args
    var args
    // if sub-step has input map use it
    if (defined(subStep.input)) {
        args = this.getInput(this.data, subStep.input)
    }
    // otherse use step input map if defined
    else if (defined(step.input)) {
        args = this.getInput(this.data, step.input)
    }
    // otherwise use all data for args
    else {
        args = this.data
    }
    // run method
    var result = await (method)(args)
    // set check result flag - if true method not retried
    this.status.checkResult = defined(result)
    // add result to data if sub-step output map defined
    if (defined(subStep.output)) {
        // merge results to data
        _.merge(this.data, this.getOutput(result, subStep.output))
    }
}

/**
 * @function runStepError
 *
 * run error sub-step
 *
 * @returns {Promise<undefined>}
 */
async function runStepError () {
    // get step
    var step = this.status.step
    // get error sub-step
    var subStep = step.error
    // get method - throws error if not found
    var method = this.task.getMethod(subStep.method)
    // method args
    var args
    // if sub-step has input map use it
    if (defined(subStep.input)) {
        args = this.getInput(this.data, subStep.input)
    }
    // otherse use step input map if defined
    else if (defined(step.input)) {
        args = this.getInput(this.data, step.input)
    }
    // otherwise use all data for args
    else {
        args = this.data
    }
    // run method
    var result = await (method)(args)
    // add result to data if sub-step output map defined
    if (defined(subStep.output)) {
        // merge results to data
        _.merge(this.data, this.getOutput(result, subStep.output))
    }
}

/**
 * @function runStepErrorCheck
 *
 * run error check sub-step
 *
 * @returns {Promise<undefined>}
 */
async function runStepErrorCheck () {
    // get step
    var step = this.status.step
    // get error check sub-step
    var subStep = step.error.check
    // get error sub-step
    var errorStep = step.error
    // get method - throws error if not found
    var method = this.task.getMethod(subStep.method)
    // method args
    var args
    // if error check has input map use it
    if (defined(subStep.input)) {
        args = this.getInput(this.data, subStep.input)
    }
    // otherwise use error input map if defined
    else if (defined(errorStep.input)) {
        args = this.getInput(this.data, errorStep.input)
    }
    // otherse use method input map if defined
    else if (defined(step.input)) {
        args = this.getInput(this.data, step.input)
    }
    // otherwise use all data for args
    else {
        args = this.data
    }
    // run method
    var result = await (method)(args)
    // set check result flag - if true method not retried
    this.status.errorCheckResult = defined(result)
    // add result to data if sub-step output map defined
    if (defined(subStep.output)) {
        // merge results to data
        _.merge(this.data, this.getOutput(result, subStep.output))
    }
}

/**
 * @function runStepMethod
 *
 * run method sub-step
 *
 * @returns {Promise<undefined>}
 */
async function runStepMethod () {
    // get step
    var step = this.status.step
    // get method - throws error if not found
    var method = this.task.getMethod(step.method)
    // get args - apply input map if defined
    var args = defined(step.input)
        ? this.getInput(this.data, step.input)
        : this.data
    // run method
    var result = await (method)(args)
    // apply output map if defined
    if (defined(step.output)) {
        result = this.getOutput(result, step.output)
    }
    // merge results to data
    _.merge(this.data, result)
}

/**
 * @function runStepError
 *
 * report error on run
 *
 * @param {Error} error
 */
async function runStepErrorHandler (error) {
    // debug errors
    debug('run error', error)
    // create error object it it doesn't exist
    if (!defined(this.status.error)) {
        this.status.error = {}
    }
    // save error for sub-step
    this.status.error[this.status.subStep] = _.pick(error, ['code', 'data', 'message', 'stack'])
}

/**
 * @function runStepReverse
 *
 * run reverse sub-step
 *
 * @returns {Promise<undefined>}
 */
async function runStepReverse () {
    // get step
    var step = this.status.step
    // get reverse sub-step
    var subStep = step.reverse
    // get method - throws error if not found
    var method = this.task.getMethod(subStep.method)
    // method args
    var args
    // if sub-step has input map use it
    if (defined(subStep.input)) {
        args = this.getInput(this.data, subStep.input)
    }
    // otherse use step input map if defined
    else if (defined(step.input)) {
        args = this.getInput(this.data, step.input)
    }
    // otherwise use all data for args
    else {
        args = this.data
    }
    // run method
    var result = await (method)(args)
    // add result to data if sub-step output map defined
    if (defined(subStep.output)) {
        // merge results to data
        _.merge(this.data, this.getOutput(result, subStep.output))
    }
}

/**
 * @function runStepReverseCheck
 *
 * run error check sub-step
 *
 * @returns {Promise<undefined>}
 */
async function runStepReverseCheck () {
    // get step
    var step = this.status.step
    // get error check sub-step
    var subStep = step.reverse.check
    // get reverse sub-step
    var reverseStep = step.reverse
    // get method - throws error if not found
    var method = this.task.getMethod(subStep.method)
    // method args
    var args
    // if error check has input map use it
    if (defined(subStep.input)) {
        args = this.getInput(this.data, subStep.input)
    }
    // otherwise use error input map if defined
    else if (defined(reverseStep.input)) {
        args = this.getInput(this.data, reverseStep.input)
    }
    // otherse use method input map if defined
    else if (defined(step.input)) {
        args = this.getInput(this.data, step.input)
    }
    // otherwise use all data for args
    else {
        args = this.data
    }
    // run method
    var result = await (method)(args)
    // set check result flag - if true method not retried
    this.status.reverseCheckResult = defined(result)
    // add result to data if sub-step output map defined
    if (defined(subStep.output)) {
        // merge results to data
        _.merge(this.data, this.getOutput(result, subStep.output))
    }
}

/**
 * @function runSuccess
 *
 * report result of run
 *
 * @param {object} result
 */
async function runSuccess (result) {
    // clear running flag
    this.status.running = undefined
    // merge result to data
    _.merge(this.data, result)
}

/**
 * @function save
 *
 * save execution status
 *
 * @returns {ImmutableCoreModelRecord}
 */
async function save () {
    this.record = await this.record.updateMeta({
        data: this.record.data,
        merge: false,
    })
}

/**
 * @function setStep
 *
 * set step to process from stepNum
 *
 * @throws {Error}
 */
function setStep () {
    // set step from step number
    this.status.step = this.task.steps[this.status.stepNum]
    // require step
    this.assert(defined(this.status.step), 200, `step ${this.status.stepNum} not defined`)
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