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

describe.skip('immutable-core-task-instance run', function () {

    var instance, instanceModel, task, taskModel, sandbox

    var check1, error1, error3, errorCheck1, method1, method2, method3,
        reverse1, reverseCheck1

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
        check1 = sandbox.stub()
        error1 = sandbox.stub()
        error3 = sandbox.stub()
        errorCheck1 = sandbox.stub()
        method1 = sandbox.stub()
        method2 = sandbox.stub()
        method3 = sandbox.stub()
        reverse1 = sandbox.stub()
        reverseCheck1 = sandbox.stub()
        // initialize models
        var models = await initModels({database, session})
        instanceModel = models.instanceModel
        taskModel = models.taskModel
        // create foo task
        task = new ImmutableCoreTask({
            instanceModel: instanceModel,
            methods: {
                error3: error3,
                method1: method1,
                method2: method2,
                method3: method3,
                reverse1: reverse1,
                reverseCheck1: reverseCheck1,
            },
            name: 'foo',
            steps: [
                {
                    method: 'method1',
                    reverse: 'reverse1',
                },
                {
                    method: 'method2',
                },
                {
                    error: 'error3',
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

    describe('when method without error handler fails', function () {

        beforeEach(function () {
            method1.resolves()
            method2.rejects()
        })

        it('should run reverse', async function () {
            // run task
            await instance.run()
            // check that methods run
            assert.calledOnce(method1)
            assert.calledOnce(method2)
            assert.calledOnce(reverse1)
            // reload data
            await instance.reload()
            // check data state
            assert.isTrue(instance.record.data.complete)
            assert.isFalse(instance.record.data.success)
        })

    })

})