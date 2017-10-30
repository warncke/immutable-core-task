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

describe.only('immutable-core-task-instance run', function () {

    var instance, instanceModel, instanceModelGlboal, task, taskModel,
        taskModelGlobal, sandbox

    var check1, error1, errorCheck1, method1, method2, method3, reverse1,
        reverseCheck1

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

        check1 = sandbox.stub()
        error1 = sandbox.stub()
        errorCheck1 = sandbox.stub()
        method1 = sandbox.stub()
        method2 = sandbox.stub()
        method3 = sandbox.stub()
        reverse1 = sandbox.stub()
        reverseCheck1 = sandbox.stub()

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
        task = new ImmutableCoreTask({
            instanceModel: instanceModel,
            methods: {
                check1: check1,
                error1: error1,
                errorCheck1: errorCheck1,
                method1: method1,
                method2: method2,
                method3: method3,
                reverse1: reverse1,
                reverseCheck1: reverseCheck1,
            },
            name: 'foo',
            steps: [
                {
                    check: 'check1',
                    error: {
                        check: 'errorCheck1',
                        method: 'error1',
                        retry: true,
                    },
                    method: 'method1',
                    retry: true,
                    reverse: {
                        check: 'reverseCheck1',
                        method: 'reverse1',
                        retry: true,
                    },
                },
                {
                    async: true,
                    method: 'method2',
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

    describe('when all methods succeed', function () {

        beforeEach(function () {
            method1.resolves({bam: true})
            method2.resolves({bar: true})
            method3.resolves({baz: true})
        })

        it('should complete task', async function () {
            // run task
            await instance.run()
            // check that methods run
            assert.calledOnce(method1)
            assert.calledOnce(method2)
            assert.calledOnce(method3)
            // get current instance
            instance = await instanceModel.query({
                current: true,
                one: true,
                where: {id: instance.record.id},
            })
            // check data state
            assert.isTrue(instance.data.complete)
            assert.isTrue(instance.data.success)
            assert.isUndefined(instance.data.status)
            assert.deepEqual(instance.data.data, {
                bam: true,
                bar: true,
                baz: true,
                session: session,
            })
        })

    })

})