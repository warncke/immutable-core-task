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

describe('immutable-core-task-instance run', function () {

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
                check1: check1,
                error1: error1,
                errorCheck1: errorCheck1,
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
                    error: 'error1',
                    method: 'method1',
                },
                {
                    method: 'method2',
                },
                {
                    error: 'error3',
                    method: 'method3',
                    retry: true,
                },
            ],
            taskModel: taskModel,
        })
        // sync task
        await task.sync()
        // create new instance
        instance = await task.new({session})
    })

    afterEach(async function () {
        sandbox.restore()
        await mysql.close()
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
            assert.isUndefined(instance.data.nextRunTime)
            assert.deepEqual(instance.data.data, {
                bam: true,
                bar: true,
                baz: true,
                session: session,
            })
        })

    })

    describe('when method without retry has error', function () {

        var error

        beforeEach(function () {
            error = {
                code: 100,
                data: {foo: true},
                message: 'error',
                stack: 'stack',
            }

            method1.resolves({bam: true})
            method2.rejects(error)
        })

        it('it should complete task with success:false', async function () {
            // run task
            await instance.run()
            // check that methods run
            assert.calledOnce(method1)
            assert.calledOnce(method2)
            assert.notCalled(method3)
            // get current instance
            instance = await instanceModel.query({
                current: true,
                one: true,
                where: {id: instance.record.id},
            })
            // check data state
            assert.isTrue(instance.data.complete)
            assert.isFalse(instance.data.success)
            assert.isUndefined(instance.data.nextRunTime)
            assert.isObject(instance.data.status)
            assert.deepEqual(instance.data.data, {
                bam: true,
                session: session,
            })
        })
    })

    describe('when method with error handler has error', function () {

        var error

        beforeEach(function () {
            error = {
                code: 100,
                data: {foo: true},
                message: 'error',
                stack: 'stack',
            }

            method1.rejects(error)
        })

        it('it should complete task with success:true', async function () {
            // run task
            await instance.run()
            // check that methods run
            assert.calledOnce(method1)
            assert.notCalled(method2)
            assert.notCalled(method3)
            // get current instance
            instance = await instanceModel.query({
                current: true,
                one: true,
                where: {id: instance.record.id},
            })
            // check data state
            assert.isTrue(instance.data.complete)
            assert.isTrue(instance.data.success)
            assert.isUndefined(instance.data.nextRunTime)
            assert.isObject(instance.data.status.error)
            assert.deepEqual(instance.data.data, {
                session: session,
            })
        })
    })

    describe('when method with retry has error', function () {

        var error

        beforeEach(function () {
            error = {
                code: 100,
                data: {foo: true},
                message: 'error',
                stack: 'stack',
            }

            method3.onCall(0).rejects(error)
            method3.onCall(1).resolves()
        })

        it('should retry method', async function () {
            // run task
            await instance.run()
            // check that methods run
            assert.calledOnce(method1)
            assert.calledOnce(method2)
            assert.calledOnce(method3)
            assert.notCalled(error3)
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
            // run task again
            await instance.run()
            // retry method should have been called
            assert.calledTwice(method3)
            assert.notCalled(error3)
            // get current instance record
            record = await instanceModel.query({
                current: true,
                one: true,
                where: {id: instance.record.id},
            })
            // check data
            assert.isTrue(record.data.complete)
            assert.isTrue(record.data.success)
        })

    })

})