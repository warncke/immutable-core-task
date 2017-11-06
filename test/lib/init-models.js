'use strict'

/* npm modules */
const ImmutableCore = require('immutable-core')
const ImmutableGlobal = require('immutable-global')
const ImmutableCoreModel = require('immutable-core-model')

/* exports */
module.exports = beforeEach

/**
 * @function beforeEach
 *
 * shared initialization for tests
 */
async function beforeEach (args) {
    // reset global data
    ImmutableCore.reset()
    ImmutableCoreModel.reset()
    ImmutableGlobal.reset()
    // drop any test tables if they exist
    await args.database.query('DROP TABLE IF EXISTS task')
    await args.database.query('DROP TABLE IF EXISTS taskInstance')
    // create task model
    var taskModelGlobal = new ImmutableCoreModel({
        columns: {
            name: {
                immutable: true,
                type: 'string',
                unique: true,
            },
        },
        compression: false,
        database: args.database,
        name: 'task',
    })
    // create instance model
    var instanceModelGlboal = new ImmutableCoreModel({
        columns: {
            nextRunTime: {
                index: true,
                null: true,
                type: 'time',
            },
            taskId: {
                index: true,
                null: false,
                type: 'id',
            },
        },
        compression: false,
        database: args.database,
        name: 'taskInstance',
    })
    // sync models
    await taskModelGlobal.sync()
    await instanceModelGlboal.sync()
    // get local models
    var taskModel = taskModelGlobal.session(args.session)
    var instanceModel = instanceModelGlboal.session(args.session)

    return {instanceModel, taskModel}
}