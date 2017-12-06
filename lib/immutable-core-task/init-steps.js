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
    // set ignoreError flag
    if (defined(args.ignoreError)) {
        // require boolean
        this.assert(_.isBoolean(args.ignoreError), 127)
        // set flag
        this.ignoreError = args.ignoreError
    }
    // require steps argument to be array
    this.assert(_.isArray(args.steps), 111)
    // require at least one step
    this.assert(args.steps.length > 0, 118)
    // will be set if any step has reverse method
    this.hasReverse = false
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