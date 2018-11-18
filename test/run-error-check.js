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

describe('immutable-core-task-instance run error check', function () {

    var instance, instanceModel, mysql, task, taskModel, sandbox

    var error1, errorCheck1, method1

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
        errorCheck1 = sandbox.stub()
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
                errorCheck1: errorCheck1,
                method1: method1,
            },
            name: 'foo',
            steps: [
                {
                    error: {
                        check: {
                            input: {foo: 'bar'},
                            method: 'errorCheck1',
                            output: {bar: 'foo'},
                            retry: true,
                        },
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
            foo: 1,
            session: session,
        })
    })

    afterEach(async function () {
        sandbox.restore()
        await mysql.close()
    })

    describe('when error check returns undefined', function () {

        beforeEach(function () {
            // method should always reject
            method1.rejects()
            // reject on first error handler call
            error1.onCall(0).rejects()
            // resolve on second 
            error1.onCall(1).resolves()
            // resolve check with undefined so error should be called again
            errorCheck1.resolves();
        })

        it('should retry error', async function () {
            // run task
            await instance.run()
            // reload instance data
            await instance.reload()
            // check data state
            assert.isFalse(instance.record.data.complete)
            assert.isUndefined(instance.record.data.success)
            // run again
            await instance.run()
            // check that methods run
            assert.calledOnce(method1)
            assert.calledTwice(error1)
            assert.calledOnce(errorCheck1)
            assert.calledWithMatch(errorCheck1, {bar: 1})
            // reload instance data
            await instance.reload()
            // check data state
            assert.isTrue(instance.record.data.complete)
            assert.isTrue(instance.record.data.success)
        })

    })

    describe('when error check returns value', function () {

        beforeEach(function () {
            // method should always reject
            method1.rejects()
            // reject on error call
            error1.rejects()
            // resolve check with value so error should not be called again
            errorCheck1.resolves({bar: 2})
        })

        it('should not retry error', async function () {
            // run task
            await instance.run()
            // reload instance data
            await instance.reload()
            // check data state
            assert.isFalse(instance.record.data.complete)
            assert.isUndefined(instance.record.data.success)
            // run again
            await instance.run()
            // check that methods run
            assert.calledOnce(method1)
            assert.calledOnce(error1)
            assert.calledOnce(errorCheck1)
            assert.calledWithMatch(errorCheck1, {bar: 1})
            // reload instance data
            await instance.reload()
            // check data state
            assert.isTrue(instance.record.data.complete)
            assert.isTrue(instance.record.data.success)
            assert.strictEqual(instance.record.data.data.foo, 2)
        })

    })

    describe('when error check has error', function () {

        beforeEach(function () {
            // method should always reject
            method1.rejects()
            // reject on error call
            error1.rejects()
            // reject on first check call
            errorCheck1.onCall(0).rejects()
            // resolve check with value so error should not be called again
            errorCheck1.onCall(1).resolves({bar: 2})
        })

        it('should retry error check', async function () {
            // run task
            await instance.run()
            // reload instance data
            await instance.reload()
            // check data state
            assert.isFalse(instance.record.data.complete)
            assert.isUndefined(instance.record.data.success)
            // run again
            await instance.run()
            // reload instance data
            await instance.reload()
            // run again
            await instance.run()
            // check that methods run
            assert.calledOnce(method1)
            assert.calledOnce(error1)
            assert.calledTwice(errorCheck1)
            // reload instance data
            await instance.reload()
            // check data state
            assert.isTrue(instance.record.data.complete)
            assert.isTrue(instance.record.data.success)
            assert.strictEqual(instance.record.data.data.foo, 2)
        })

    })

})