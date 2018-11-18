'use strict'

/* npm modules */
const ImmutableCore = require('immutable-core')
const ImmutableGlobal = require('immutable-global')
const ImmutableCoreModel = require('immutable-core-model')

/* exports */
module.exports = initModels

/* globals */
const dbHost = process.env.DB_HOST || 'localhost'
const dbName = process.env.DB_NAME || 'test'
const dbPass = process.env.DB_PASS || ''
const dbUser = process.env.DB_USER || 'root'

const connectionParams = {
    database: dbName,
    host: dbHost,
    password: dbPass,
    user: dbUser,
}

/**
 * @function beforeEach
 *
 * shared initialization for tests
 */
async function initModels (args) {
    // reset global data
    ImmutableCore.reset()
    ImmutableCoreModel.reset()
    ImmutableGlobal.reset()
    // create mysql client
    const mysql = await ImmutableCoreModel.createMysqlConnection(connectionParams)
    // drop any test tables if they exist
    await mysql.query('DROP TABLE IF EXISTS task')
    await mysql.query('DROP TABLE IF EXISTS taskInstance')
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
        mysql: mysql,
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
        mysql: mysql,
        name: 'taskInstance',
    })
    // sync models
    await taskModelGlobal.sync()
    await instanceModelGlboal.sync()
    // get local models
    var taskModel = taskModelGlobal.session(args.session)
    var instanceModel = instanceModelGlboal.session(args.session)

    return {instanceModel, mysql, taskModel}
}