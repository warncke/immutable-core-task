'use strict'

/* npm modules */
const ImmutableAI = require('immutable-ai')
const ImmutableCore = require('immutable-core')
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

describe('immutable-core-task-instance run error retry', function () {

    var instance, instanceModel, mysql, task, taskModel, sandbox

    var error1, method1

    // fake session to use for testing
    var session = {
        accountId: '11111111111111111111111111111111',
        roles: ['all', 'authenticated'],
        sessionId: '22222222222222222222222222222222',
    }

    beforeEach(async function () {
        sandbox = sinon.createSandbox()
        // create stubs for task methods
        error1 = sandbox.stub()
        method1 = sandbox.stub()
        // initialize models
        var models = await initModels({session})
        instanceModel = models.instanceModel
        taskModel = models.taskModel
        mysql = models.mysql
        // create foo task
        task = new ImmutableCoreTask({
            instanceModel: instanceModel,
            methods: {
                error1: error1,
                method1: method1,
            },
            name: 'foo',
            steps: [
                {
                    error: {
                        method: 'error1',
                        retry: true,
                    },
                    method: 'method1',
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

    afterEach(async function () {
        sandbox.restore()
        await mysql.close()
    })

    describe('when error handler has error', function () {

        beforeEach(function () {
            // method should always reject
            method1.rejects()
            // reject on first error handler call
            error1.onCall(0).rejects()
            // resolve on second 
            error1.onCall(1).resolves()
        })

        it('should retry', async function () {
            // run task
            await instance.run()
            // get current instance record
            var record = await instanceModel.query({
                current: true,
                one: true,
                where: {id: instance.record.id},
            })
            // get original instance record
            var origRecord = await instanceModel.query({
                one: true,
                where: {id: instance.record.originalId},
            })
            // check that nextRunTime changed
            assert.notStrictEqual(record.data.nextRunTime, origRecord.data.nextRunTime)
            // check data state
            assert.isFalse(record.data.complete)
            assert.isUndefined(record.data.success)
            // create new instance from record
            instance = new ImmutableCoreTaskInstance({record: record})
            // run again
            await instance.run()
            // check that methods run
            assert.calledOnce(method1)
            assert.calledTwice(error1)
            // get current instance
            instance = await instanceModel.query({
                current: true,
                one: true,
                where: {id: instance.record.id},
            })
            // check data state
            assert.isTrue(instance.data.complete)
            assert.isTrue(instance.data.success)
        })

    })

})