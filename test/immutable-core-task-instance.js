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

describe('immutable-core-task-instance', function () {

    var fooTask, instanceModel, mysql, taskModel

    // fake session to use for testing
    var session = {
        accountId: '11111111111111111111111111111111',
        roles: ['all', 'authenticated'],
        sessionId: '22222222222222222222222222222222',
    }

    before(async function () {
        // initialize models
        var models = await initModels({session})
        instanceModel = models.instanceModel
        taskModel = models.taskModel
        mysql = models.mysql
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

    after(async function () {
        await mysql.close()
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