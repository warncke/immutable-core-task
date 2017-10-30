'use strict'

/* npm modules */
const _ = require('lodash')
const defined = require('if-defined')

/* exports */
module.exports = initRecord

/**
 * @function initRecord
 *
 * create new task from existing and record
 *
 * @param {object} args
 *
 * @throws {Error}
 */
function initRecord (args) {
    // require orig to base new task on
    this.assert(_.isObject(args.orig) && args.orig.ImmutableCoreTask, 104)
    // set properties based on orig
    _.merge(this, args.orig)
    // override with values from record
    _.merge(this, args.record.data)
    // set taskId from record
    this.taskId = args.record.id
    // add to global register
    this.global().tasksById[this.taskId] = this
}