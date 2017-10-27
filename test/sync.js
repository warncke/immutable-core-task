'use strict'

/* npm modules */
const ImmutableCore = require('immutable-core')
const ImmutableDatabaseMariaSQL = require('immutable-database-mariasql')
const ImmutableGlobal = require('immutable-global')
const ImmutableCoreModel = require('immutable-core-model')
const Promise = require('bluebird')
const chai = require('chai')
const sinon = require('sinon')

/* application modules */
const ImmutableCoreTask = require('../lib/immutable-core-task')

/* chai config */
const assert = chai.assert
sinon.assert.expose(chai.assert, { prefix: '' })

const dbHost = process.env.DB_HOST || 'localhost'
const dbName = process.env.DB_NAME || 'test'
const dbPass = process.env.DB_PASS || ''
const dbUser = process.env.DB_USER || 'root'

const connectionParams = {
    charset: 'utf8',
    db: dbName,
    host: dbHost,
    password: dbPass,
    user: dbUser,
}

describe('immutable-core-task sync', function () {

    var taskModel, taskModelGlobal

    // create database connection to use for testing
    var database = new ImmutableDatabaseMariaSQL(connectionParams)
    // fake session to use for testing
    var session = {
        accountId: '11111111111111111111111111111111',
        roles: ['all', 'authenticated'],
        sessionId: '22222222222222222222222222222222',
    }

    before(async function () {
        // drop any test tables if they exist
        await database.query('DROP TABLE IF EXISTS task')
    })

    beforeEach(async function () {
        // reset global data
        ImmutableCore.reset()
        ImmutableCoreModel.reset()
        ImmutableGlobal.reset()
        // create task mode
        taskModelGlobal = new ImmutableCoreModel({
            columns: {
                name: {
                    immutable: true,
                    type: 'string',
                    unique: true,
                },
            },
            database: database,
            name: 'task',
        })
        // sync model
        await taskModelGlobal.sync()
        // get local task model
        taskModel = taskModelGlobal.session(session)
    })

    after(function () {
        database.close()
    })

    it('should sync task with task model', async function () {
        var task = new ImmutableCoreTask({
            methods: { bar: () => {} },
            taskModel: taskModel,
            name: 'foo',
            steps: [ { method: 'bar' } ],
        })
        // sync task
        await task.sync()
        // check that task id set
        assert.isString(task.taskId)
    })

    it('should throw error if attempting to sync without model', async function () {
        var task = new ImmutableCoreTask({
            methods: { bar: () => {} },
            name: 'foo',
            steps: [ { method: 'bar' } ],
        })
        var error
        // sync task - should throw
        try {
            await task.sync()
        }
        catch (err) {
            error = err
        }
        // check that error throw
        assert.isDefined(error)
        // chec error message
        assert.strictEqual(error.message, 'ImmutableCoreTask.foo Error: taskModel required')
    })

    it('should not create another task record for same data', async function () {
        // select all tasks
        var tasks = await taskModel.select.all.allRevisions
        // should only be one task
        assert.strictEqual(tasks.length, 1)
        // create same task again
        var task = new ImmutableCoreTask({
            methods: { bar: () => {} },
            taskModel: taskModel,
            name: 'foo',
            steps: [ { method: 'bar' } ],
        })
        // sync task
        await task.sync()
        // check that task id set
        assert.isString(task.taskId)
        // select all tasks
        var tasks = await taskModel.select.all.allRevisions
        // should only be one task
        assert.strictEqual(tasks.length, 1)
    })

    it('should update task record when steps changed', async function () {
        // select all tasks
        var tasks = await taskModel.select.all.allRevisions
        // should only be one task
        assert.strictEqual(tasks.length, 1)
        // create same task again
        var task = new ImmutableCoreTask({
            methods: { bar: () => {} },
            taskModel: taskModel,
            name: 'foo',
            steps: [ { method: 'bar' }, { method: 'bar' } ],
        })
        // sync task
        await task.sync()
        // check that task id set
        assert.isString(task.taskId)
        // select all tasks
        var tasks = await taskModel.select.all.allRevisions
        // should only be one task
        assert.strictEqual(tasks.length, 2)
    })

    it('should update task record when steps changed', async function () {
        // select all tasks
        var tasks = await taskModel.select.all.allRevisions
        // should only be one task
        assert.strictEqual(tasks.length, 2)
        // create same task again
        var task = new ImmutableCoreTask({
            data: {foo: true},
            methods: { bar: () => {} },
            taskModel: taskModel,
            name: 'foo',
            steps: [ { method: 'bar' }, { method: 'bar' } ],
        })
        // sync task
        await task.sync()
        // check that task id set
        assert.isString(task.taskId)
        // select all tasks
        var tasks = await taskModel.select.all.allRevisions
        // should only be one task
        assert.strictEqual(tasks.length, 3)
    })

    it('should create new task record for new name', async function () {
        // select all tasks
        var tasks = await taskModel.select.all
        // should only be one task
        assert.strictEqual(tasks.length, 1)
        // create same task again
        var task = new ImmutableCoreTask({
            methods: { bar: () => {} },
            taskModel: taskModel,
            name: 'foo2',
            steps: [ { method: 'bar' }, { method: 'bar' } ],
        })
        // sync task
        await task.sync()
        // check that task id set
        assert.isString(task.taskId)
        // select all tasks
        var tasks = await taskModel.select.all
        // should only be one task
        assert.strictEqual(tasks.length, 2)
    })

})