'use strict'

/* npm modules */
const ImmutableAI = require('immutable-ai')
const ImmutableCore = require('immutable-core')
const ImmutableDatabaseMariaSQL = require('immutable-database-mariasql')
const ImmutableGlobal = require('immutable-global')
const ImmutableCoreModel = require('immutable-core-model')
const Promise = require('bluebird')
const chai = require('chai')
const sinon = require('sinon')

/* application modules */
const ImmutableCoreTask = require('../lib/immutable-core-task')
const ImmutableCoreTaskInstance = require('../lib/immutable-core-task-instance')

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

describe('immutable-core-task instance', function () {

    var fooTask, instanceModel, instanceModelGlboal, taskModel,
        taskModelGlobal
        

    // create database connection to use for testing
    var database = new ImmutableDatabaseMariaSQL(connectionParams)
    // fake session to use for testing
    var session = {
        accountId: '11111111111111111111111111111111',
        roles: ['all', 'authenticated'],
        sessionId: '22222222222222222222222222222222',
    }

    before(async function () {
        // reset global data
        ImmutableCore.reset()
        ImmutableCoreModel.reset()
        ImmutableGlobal.reset()
        // drop any test tables if they exist
        await database.query('DROP TABLE IF EXISTS task')
        await database.query('DROP TABLE IF EXISTS taskInstance')
        // create task model
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
        // create instance model
        instanceModelGlboal = new ImmutableCoreModel({
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
            database: database,
            name: 'taskInstance',
        })
        // sync models
        await taskModelGlobal.sync()
        await instanceModelGlboal.sync()
        // get local models
        taskModel = taskModelGlobal.session(session)
        instanceModel = instanceModelGlboal.session(session)
        // create foo task
        fooTask = new ImmutableCoreTask({
            instanceModel: instanceModel,
            methods: { bar: () => {} },
            name: 'foo',
            steps: [ { method: 'bar' } ],
            taskModel: taskModel,
        })
        // sync task
        await fooTask.sync()
    })

    after(function () {
        database.close()
    })

    it('should instantiate new task instance', async function () {
        // create new instance
        var instance = await fooTask.new()
        // check properties
        assert.strictEqual(instance.ImmutableCoreTaskInstance, true)
        assert.strictEqual(instance.class, 'ImmutableCoreTaskInstance')
    })

    it('should instantiate new task instance with ImmutableAI', async function () {
        // create new ImmutableAI instance
        var ai = ImmutableAI({session: {}})
        // create new instance
        var instance = await ai.task.foo.new({})
        // check properties
        assert.strictEqual(instance.ImmutableCoreTaskInstance, true)
        assert.strictEqual(instance.class, 'ImmutableCoreTaskInstance')
        assert.isObject(instance.record)
        assert.strictEqual(instance.record.class, 'ImmutableCoreModelRecord')
        assert.isObject(instance.task)
        assert.strictEqual(instance.task.class, 'ImmutableCoreTask')
    })

    it('should instantiate task instance from record', async function () {
        // create new instance
        var instance = await fooTask.new()
        // create instance from record
        var newInstance = new ImmutableCoreTaskInstance({record: instance.record})
        // wait for instance to initialize
        await newInstance.promise
        // check that record and task are set on instance
        assert.isObject(newInstance.record)
        assert.strictEqual(newInstance.record.class, 'ImmutableCoreModelRecord')
        assert.isObject(newInstance.task)
        assert.strictEqual(newInstance.task.class, 'ImmutableCoreTask')
    })

    it('should instantiate task instance from record', async function () {
        // create new instance
        var instance = await fooTask.new()
        // create instance from record
        var newInstance = new ImmutableCoreTaskInstance({record: instance.record})
        // wait for instance to initialize
        await newInstance.promise
        // check that record and task are set on instance
        assert.isObject(newInstance.record)
        assert.strictEqual(newInstance.record.class, 'ImmutableCoreModelRecord')
        assert.isObject(newInstance.task)
        assert.strictEqual(newInstance.task.class, 'ImmutableCoreTask')
    })

    it('should instantiate task instance from record with old task', async function () {
        // create new instance
        var instance = await fooTask.new()
        // create new foo task
        fooTask = new ImmutableCoreTask({
            allowOverride: true,
            instanceModel: instanceModel,
            methods: { bar: () => {} },
            name: 'foo',
            steps: [ { method: 'bar' }, { method: 'bar' } ],
            taskModel: taskModel,
        })
        // sync task
        await fooTask.sync()
        // create instance from record
        var newInstance = new ImmutableCoreTaskInstance({record: instance.record})
        // wait for instance to initialize
        await newInstance.promise
        // should have original task
        assert.strictEqual(newInstance.task.taskId, instance.task.taskId)
    })

})