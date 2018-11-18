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

describe('immutable-core-task-instance run check', function () {

    var instance, instanceModel, mysql, task, taskModel, sandbox

    var check1, method1

    // fake session to use for testing
    var session = {
        accountId: '11111111111111111111111111111111',
        roles: ['all', 'authenticated'],
        sessionId: '22222222222222222222222222222222',
    }

    beforeEach(async function () {
        sandbox = sinon.createSandbox()
        // create stubs for task methods
        check1 = sandbox.stub()
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
                check1: check1,
                method1: method1,
            },
            name: 'foo',
            steps: [
                {
                    check: {
                        input: {foo: 'bar'},
                        method: 'check1',
                        output: {bar: 'foo'},
                        retry: true,
                    },
                    method: 'method1',
                    retry: true,
                },
            ],
            taskModel: taskModel,
        })
        // sync task
        await task.sync()
        // create new instance
        instance = await task.new({
            foo: 1,
            session: session,
        })
    })

    afterEach(async function () {
        sandbox.restore()
        await mysql.close()
    })

    describe('when method with check is retried and check is undefined', function () {

        beforeEach(function () {
            // reject on first method call
            method1.onCall(0).rejects()
            // resolve on second
            method1.onCall(1).resolves()
            // resolve check with undefined
            check1.onCall(0).resolves()
        })

        it('should retry method', async function () {
            // run task
            await instance.run()
            // reload instance
            await instance.reload()
            // get original instance record
            var origRecord = await instanceModel.query({
                one: true,
                where: {id: instance.record.originalId},
            })
            // check that nextRunTime changed
            assert.notStrictEqual(instance.record.data.nextRunTime, origRecord.data.nextRunTime)
            // check data state
            assert.isFalse(instance.record.data.complete)
            assert.isUndefined(instance.record.data.success)
            // run again
            await instance.run()
            // check that methods run
            assert.calledTwice(method1)
            assert.calledOnce(check1)
            assert.calledWithMatch(check1, {bar: 1, session: session})
            // reload instance
            await instance.reload()
            // check data state
            assert.isTrue(instance.record.data.complete)
            assert.isTrue(instance.record.data.success)
        })

    })

    describe('when method with check is retried and check has value', function () {

        beforeEach(function () {
            // reject on first method call
            method1.onCall(0).rejects()
            // resolve check with value
            check1.onCall(0).resolves({bar: 2, bam: true})
        })

        it('should not retry method', async function () {
            // run task
            await instance.run()
            // reload instance
            await instance.reload()
            // check data state
            assert.isFalse(instance.record.data.complete)
            assert.isUndefined(instance.record.data.success)
            // run again
            await instance.run()
            // check that methods run
            assert.calledOnce(method1)
            assert.calledOnce(check1)
            // reload instance
            await instance.reload()
            // check data state
            assert.isTrue(instance.record.data.complete)
            assert.isTrue(instance.record.data.success)
            assert.isUndefined(instance.record.data.data.bam)
            assert.strictEqual(instance.record.data.data.foo, 2)
        })

    })

    describe('when method with check is retried and check has error and retry', function () {

        beforeEach(function () {
            // reject on first method call
            method1.onCall(0).rejects()
            // reject on first check call
            check1.onCall(0).rejects()
            // resolve check with value on second call
            check1.onCall(1).resolves({bar: 2, bam: true})
        })

        it('should retry check method', async function () {
            // run task
            await instance.run()
            // reload instance
            await instance.reload()
            // check data state
            assert.isFalse(instance.record.data.complete)
            assert.isUndefined(instance.record.data.success)
            // run again
            await instance.run()
            // check that methods run
            assert.calledOnce(method1)
            assert.calledOnce(check1)
            // reload instance
            await instance.reload()
            // run again
            await instance.run()
            // check that methods run
            assert.calledOnce(method1)
            assert.calledTwice(check1)
            // reload instance
            await instance.reload()
            // check data state
            assert.isTrue(instance.record.data.complete)
            assert.isTrue(instance.record.data.success)
            assert.isUndefined(instance.record.data.data.bam)
            assert.strictEqual(instance.record.data.data.foo, 2)
        })

    })

})