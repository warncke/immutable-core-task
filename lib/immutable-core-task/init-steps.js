'use strict'

/* npm modules */
const _ = require('lodash')
const defined = require('if-defined')

/* exports */
module.exports = initSteps

/**
 * @function initSteps
 *
 * validate and add tasks steps
 *
 * @param {object} args
 *
 * @throws {Error}
 */
function initSteps (args) {
    // set continueOnError flag
    if (defined(args.continueOnError)) {
        // require boolean
        this.assert(_.isBoolean(args.continueOnError), 127)
        // set flag
        this.continueOnError = args.continueOnError
    }
    // require steps argument to be array
    this.assert(_.isArray(args.steps), 111)
    // require at least one step
    this.assert(args.steps.length > 0, 118)
    // initialize steps for task
    this.steps = _.map(args.steps, spec => this.initStep({
        async: true,
        check: true,
        continue: true,
        error: true,
        map: true,
        name: 'step',
        reverse: true,
        spec: spec
    }))
    // get number of steps
    this.numSteps = this.steps.length
}