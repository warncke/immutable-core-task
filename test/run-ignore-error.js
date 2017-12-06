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
const initModels = require('./lib/init-models')

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

describe('immutable-core-task-instance run ignore error', function () {

    var instance, instanceModel, task, taskModel, sandbox

    var error2, method1, method2, method3

    // create database connection to use for testing
    var database = new ImmutableDatabaseMariaSQL(connectionParams)
    // fake session to use for testing
    var session = {
        accountId: '11111111111111111111111111111111',
        roles: ['all', 'authenticated'],
        sessionId: '22222222222222222222222222222222',
    }

    beforeEach(async function () {
        sandbox = sinon.sandbox.create()
        // create stubs for task methods
        error2 = sandbox.stub()
        method1 = sandbox.stub()
        method2 = sandbox.stub()
        method3 = sandbox.stub()
        // initialize models
        var models = await initModels({database, session})
        instanceModel = models.instanceModel
        taskModel = models.taskModel
        // create foo task
        task = new ImmutableCoreTask({
            instanceModel: instanceModel,
            methods: {
                error2: error2,
                method1: method1,
                method2: method2,
                method3: method3,
            },
            name: 'foo',
            steps: [
                {
                    method: 'method1',
                    ignoreError: true,
                },
                {
                    error: 'error2',
                    method: 'method2',
                    ignoreError: true,
                },
                {
                    method: 'method3',
                },
            ],
            taskModel: taskModel,
        })
        // sync task
        await task.sync()
        // create new instance
        instance = await task.new({
            session: session,
        })
    })

    afterEach(function () {
        sandbox.restore()
    })

    after(function () {
        database.close()
    })

    describe('when method without error handler has ignoreError', function () {

        beforeEach(function () {
            method1.rejects()
            method2.resolves()
            method3.resolves()
        })

        it('should complete task', async function () {
            // run task
            await instance.run()
            // reload instance data
            await instance.reload()
            // check data state
            assert.isTrue(instance.record.data.complete)
            assert.isTrue(instance.record.data.success)
        })

    })

    describe('when method has ignoreError and error handler fails', function () {

        beforeEach(function () {
            method1.resolves()
            method2.rejects()
            error2.rejects()
            method3.resolves()
        })

        it('should complete task', async function () {
            // run task
            await instance.run()
            // reload instance data
            await instance.reload()
            // check data state
            assert.isTrue(instance.record.data.complete)
            assert.isTrue(instance.record.data.success)
        })

    })

})