'use strict'

/* npm modules */
const defined = require('if-defined')
const stableId = require('stable-id')

/* exports */
module.exports = sync

/**
 * @function sync
 *
 * sync task record and set taskId
 */
async function sync () {
    // get model - throws error if not set
    var model = this.taskModel()
    // calculate id for instance data
    var dataId = stableId(this)
    // load most recent task record for name if any
    var task = await model.query({
        one: true,
        where: { name: this.name }
    })
    // if task is found then check if it is same
    if (defined(task)) {
        // get id for task data
        var taskDataId = stableId(task.data)
        // if definition has not changed then use this record
        if (taskDataId === dataId) {
            this.taskId = task.id
        }
        // otherwise update record with current data
        else {
            // set task with current data
            task = await task.updateMeta({
                data: this.toJSON(),
                merge: false,
            })
            // set task id from updated task
            this.taskId = task.id
        }
    }
    // create new task
    else {
        task = await model.create(this.toJSON())
        // set task id from newly created task
        this.taskId = task.id
    }
    // add to global register
    this.global().tasksById[this.taskId] = this
}