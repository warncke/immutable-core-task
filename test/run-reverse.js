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

describe('immutable-core-task-instance run reverse', function () {

    var instance, instanceModel, mysql, task, taskModel, sandbox

    var check1, error1, error3, errorCheck1, method1, method2, method3,
        reverse1, reverseCheck1

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
        error1 = sandbox.stub()
        error3 = sandbox.stub()
        errorCheck1 = sandbox.stub()
        method1 = sandbox.stub()
        method2 = sandbox.stub()
        method3 = sandbox.stub()
        reverse1 = sandbox.stub()
        reverseCheck1 = sandbox.stub()
        // initialize models
        var models = await initModels({session})
        instanceModel = models.instanceModel
        taskModel = models.taskModel
        mysql = models.mysql
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

    afterEach(async function () {
        sandbox.restore()
        await mysql.close()
    })

    describe('when method without error handler fails', function () {

        beforeEach(function () {
            method1.resolves()
            method2.rejects()
            reverse1.resolves()
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

    describe('when method with reverse method fails', function () {

        beforeEach(function () {
            method1.rejects()
        })

        it('should not run reverse on method that did not succeed', async function () {
            // run task
            await instance.run()
            // check that methods run
            assert.calledOnce(method1)
            assert.notCalled(reverse1)
            // reload data
            await instance.reload()
            // check data state
            assert.isTrue(instance.record.data.complete)
            assert.isFalse(instance.record.data.success)
        })

    })

    describe('when method with error handler fails and error handler succeeds', function () {

        beforeEach(function () {
            method1.resolves()
            method2.resolves()
            method3.rejects()
            error3.resolves()
            reverse1.resolves()
        })

        it('should run reverse', async function () {
            // run task
            await instance.run()
            // check that methods run
            assert.calledOnce(method1)
            assert.calledOnce(method2)
            assert.calledOnce(method3)
            assert.calledOnce(error3)
            assert.calledOnce(reverse1)
            // reload data
            await instance.reload()
            // check data state
            assert.isTrue(instance.record.data.complete)
            assert.isTrue(instance.record.data.success)
        })

    })

    describe('when method with error handler fails and error handler fails', function () {

        beforeEach(function () {
            method1.resolves()
            method2.resolves()
            method3.rejects()
            error3.rejects()
            reverse1.resolves()
        })

        it('should run reverse', async function () {
            // run task
            await instance.run()
            // check that methods run
            assert.calledOnce(method1)
            assert.calledOnce(method2)
            assert.calledOnce(method3)
            assert.calledOnce(error3)
            assert.calledOnce(reverse1)
            // reload data
            await instance.reload()
            // check data state
            assert.isTrue(instance.record.data.complete)
            assert.isFalse(instance.record.data.success)
        })

    })

    describe('when method with error handler fails and error handler succeeds but reverse method fails', function () {

        beforeEach(function () {
            method1.resolves()
            method2.resolves()
            method3.rejects()
            error3.resolves()
            reverse1.rejects()
        })

        it('should run reverse', async function () {
            // run task
            await instance.run()
            // check that methods run
            assert.calledOnce(method1)
            assert.calledOnce(method2)
            assert.calledOnce(method3)
            assert.calledOnce(error3)
            assert.calledOnce(reverse1)
            // reload data
            await instance.reload()
            // check data state
            assert.isTrue(instance.record.data.complete)
            assert.isFalse(instance.record.data.success)
        })

    })

})