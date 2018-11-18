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

describe('immutable-core-task-instance run reverse retry', function () {

    var instance, instanceModel, mysql, task, taskModel, sandbox

    var method1, method2, method3, reverse1, reverseCheck1, reverse2

    // fake session to use for testing
    var session = {
        accountId: '11111111111111111111111111111111',
        roles: ['all', 'authenticated'],
        sessionId: '22222222222222222222222222222222',
    }

    beforeEach(async function () {
        sandbox = sinon.createSandbox()
        // create stubs for task methods
        method1 = sandbox.stub()
        method2 = sandbox.stub()
        method3 = sandbox.stub()
        reverse1 = sandbox.stub()
        reverseCheck1 = sandbox.stub()
        reverse2 = sandbox.stub()
        // initialize models
        var models = await initModels({session})
        instanceModel = models.instanceModel
        taskModel = models.taskModel
        mysql = models.mysql
        // create foo task
        task = new ImmutableCoreTask({
            instanceModel: instanceModel,
            methods: {
                method1: method1,
                method2: method2,
                method3: method3,
                reverse1: reverse1,
                reverseCheck1: reverseCheck1,
                reverse2: reverse2,
            },
            name: 'foo',
            steps: [
                {
                    method: 'method1',
                    reverse: {
                        check: {
                            method: 'reverseCheck1',
                            retry: true,
                        },
                        method: 'reverse1',
                        retry: true,
                    } 
                },
                {
                    method: 'method2',
                    reverse: {
                        method: 'reverse2',
                        retry: true,
                    },
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

    afterEach(async function () {
        sandbox.restore()
        await mysql.close()
    })

    describe('when reverse method has error', function () {

        beforeEach(function () {
            method1.resolves()
            method2.resolves()
            method3.rejects()
            reverse1.resolves()
            // reject on first call
            reverse2.onCall(0).rejects()
            // resolve on second call
            reverse2.onCall(1).resolves()
        })

        it('should retry reverse', async function () {
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
            assert.calledOnce(reverse1)
            assert.calledTwice(reverse2)
            // reload instance data
            await instance.reload()
            // check data state
            assert.isTrue(instance.record.data.complete)
            assert.isFalse(instance.record.data.success)
        })

    })

    describe('when reverse method with check has error', function () {

        beforeEach(function () {
            method1.resolves()
            method2.resolves()
            method3.rejects()
            reverse2.resolves()
            // reject on first call
            reverse1.onCall(0).rejects()
            // resolve on second call
            reverse1.onCall(1).resolves()
        })

        it('should call check method before calling reverse', async function () {
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
            assert.calledTwice(reverse1)
            assert.calledOnce(reverseCheck1)
            assert.calledOnce(reverse2)
            // reload instance data
            await instance.reload()
            // check data state
            assert.isTrue(instance.record.data.complete)
            assert.isFalse(instance.record.data.success)
        })

    })

    describe('when reverse check method resolves with value', function () {

        beforeEach(function () {
            method1.resolves()
            method2.resolves()
            method3.rejects()
            reverse2.resolves()
            reverseCheck1.resolves({})
            // reject on first call
            reverse1.onCall(0).rejects()
            // resolve on second call
            reverse1.onCall(1).resolves()
        })

        it('should not call reverse method again', async function () {
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
            assert.calledOnce(reverse1)
            assert.calledOnce(reverseCheck1)
            assert.calledOnce(reverse2)
            // reload instance data
            await instance.reload()
            // check data state
            assert.isTrue(instance.record.data.complete)
            assert.isFalse(instance.record.data.success)
        })

    })

    describe('when reverse check method has error', function () {

        beforeEach(function () {
            method1.resolves()
            method2.resolves()
            method3.rejects()
            reverse2.resolves()
            // reject on first call
            reverse1.onCall(0).rejects()
            reverseCheck1.onCall(0).rejects()
            // resolve on second call
            reverse1.onCall(1).resolves()
            reverseCheck1.onCall(1).resolves()
        })

        it('should retry reverse check method', async function () {
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
            // check data state
            assert.isFalse(instance.record.data.complete)
            assert.isUndefined(instance.record.data.success)
            // run again
            await instance.run()
            // check that methods run
            assert.calledTwice(reverse1)
            assert.calledTwice(reverseCheck1)
            assert.calledOnce(reverse2)
            // reload instance data
            await instance.reload()
            // check data state
            assert.isTrue(instance.record.data.complete)
            assert.isFalse(instance.record.data.success)
        })

    })

})