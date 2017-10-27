'use strict'

/* npm modules */
const _ = require('lodash')
const defined = require('if-defined')

/* exports */
module.exports = initStep

/**
 * @initStep
 *
 * initialize step, check, error, reverse methods
 *
 * @param {object} args
 * @param {bolean} args.async
 * @param {bolean} args.check
 * @param {bolean} args.error
 * @param {bolean} args.map
 * @param {bolean} args.reverse
 * @param {object} args.spec
 *
 * @returns {object}
 *
 * @throws {Error}
 */
function initStep (args) {
    // create new step/sub-step object
    var step = {}
    // step specification
    var spec
    // step method signature
    var method
    // args is object
    if (_.isPlainObject(args.spec)) {
        spec = args.spec
        method = args.spec.method
    }
    // if args is string convert to object
    else if (_.isString(args.spec)) {
        spec = {}
        method = args.spec
    }
    else {
        this.throw(120, `${args.name} must be object or string`)
    }
    // get validated canonical method signature
    method = this.getSignature(method)
    // add async flag
    if (args.async && defined(spec.async)) {
        // require flag to be boolean
        this.assert(typeof spec.async === 'boolean', 119)
        // set async flag for step
        step.async = spec.async
    }
    // add check method
    if (args.check && defined(spec.check)) {
        // require retry
        this.assert(defined(spec.retry) && spec.retry !== false, 126, `${args.name} retry must be true when check method set`)
        // create check sub-step
        step.check = this.initStep({name: 'step check', spec: spec.check})
    }
    // set continueOnError flag
    if (args.continue && defined(spec.continueOnError)) {
        // require boolean
        this.assert(_.isBoolean(spec.continueOnError), 127)
        // set flag
        step.continueOnError = spec.continueOnError
    }
    // add error method
    if (args.error && defined(spec.error)) {
        // create error sub-step with check sub-step and io mapping
        step.error = this.initStep({check: true, map: true, name: 'error', spec: spec.error})
    }
    // add input map
    if (args.map && defined(spec.input)) {
        // input must be plain object
        this.assert(_.isPlainObject(spec.input), 121, `${args.name} input must be object`)
        // create input map
        step.input = {}
        // validate input map
        _.each(spec.input, (value, key) => {
            // require string
            this.assert(_.isString(value), 123, `${args.name} input map value must be string`)
            // set input map entry
            step.input[key] = value
        })
    }
    // add method signature to all steps
    step.method = method
    // add output map
    if (args.map && defined(spec.output)) {
        // output must be plain object
        this.assert(_.isPlainObject(spec.output), 122, `${args.name} output must be object`)
        // create input map
        step.output = {}
        // validate input map
        _.each(spec.output, (value, key) => {
            // require string
            this.assert(_.isString(value), 123, `${args.name} output map value must be string`)
            // set input map entry
            step.output[key] = value
        })
    }
    // add retry to all steps
    if (defined(spec.retry) && spec.retry !== false) {
        step.retry = this.initRetry(spec.retry)
    }
    // add reverse method
    if (args.reverse && defined(spec.reverse)) {
        // create reverse sub-step with check sub-step and io mapping
        step.reverse = this.initStep({check: true, map: true, name: 'reverse', spec: spec.reverse})
    }
    // return step object
    return step
}