'use strict'

/* exports */
module.exports = initRetry

/**
 * @function initRetry
 *
 * validate retry arguments and set defaults
 *
 * @param {boolean} args
 *
 * @returns {object}
 *
 * @throws {Error}
 */
function initRetry (args) {
    var retry = {}
    // if argument is true then use auto which lets the task runner
    // decide how many times and when to retry
    if (args === true) {
        retry.type = 'auto'
    }
    else {
        this.throw(115)
    }

    return retry
}