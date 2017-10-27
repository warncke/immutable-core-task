'use strict'

/* npm modules */
const ImmutableAI = require('immutable-ai')
const ImmutableCore = require('immutable-core')
const ImmutableGlobal = require('immutable-global')
const Promise = require('bluebird')
const chai = require('chai')
const sinon = require('sinon')

/* application modules */
const ImmutableCoreTask = require('../lib/immutable-core-task')

/* chai config */
const assert = chai.assert
sinon.assert.expose(chai.assert, { prefix: '' })

describe('immutable-core-task', function () {

    var sandbox

    beforeEach(function () {
        // reset global data
        ImmutableCore.reset()
        ImmutableCoreTask.reset()
        // create sinon sandbox
        sandbox = sinon.sandbox.create()
    })

    afterEach(function () {
        // clear sinon sandbox
        sandbox.restore()
    })

    it('should instantiate new task', function () {
        var task = new ImmutableCoreTask({
            methods: { bar: () => {} },
            name: 'foo',
            steps: [ { method: 'bar' } ],
        })
        // check properties
        assert.strictEqual(task.ImmutableCoreTask, true)
        assert.strictEqual(task.class, 'ImmutableCoreTask')
        // should create module
        var task = ImmutableCore.module('fooTask')
        // validate module
        assert.strictEqual(task.meta.class, 'ImmutableCoreTask')
    })

    it('should throw error on missing arguments', function () {
        assert.throws(() => new ImmutableCoreTask(), 'ImmutableCoreTask Error: arguments object required')
    })

    it('should throw error on invalid arguments', function () {
        assert.throws(() => new ImmutableCoreTask([]), 'ImmutableCoreTask Error: arguments object required')
    })

    it('should throw error when called without new', function () {
        assert.throws(() => ImmutableCoreTask(), 'ImmutableCoreTask Error: ImmutableCoreTask must be called with new')
    })

    it('should get task', function () {
        var task = new ImmutableCoreTask({
            methods: { bar: () => {} },
            name: 'foo',
            steps: [ { method: 'bar' } ],
        })
        // get task
        assert.deepEqual(task, ImmutableCoreTask.task('foo'))
    })

    it('should check if task defined', function () {
        // check false
        assert.isFalse(ImmutableCoreTask.hasTask('foo'))
        // create task
        var task = new ImmutableCoreTask({
            methods: { bar: () => {} },
            name: 'foo',
            steps: [ { method: 'bar' } ],
        })
        // check true
        assert.isTrue(ImmutableCoreTask.hasTask('foo'))
    })

    it('should throw error getting task that is not defined', function () {
        assert.throws(() => {
            ImmutableCoreTask.task('foo')
        }, 'foo task not defined')
    })


    it('should create task methods', async function () {
        var task = new ImmutableCoreTask({
            methods: {
                bar: () => {},
                foo: () => {},
            },
            name: 'foo',
            steps: [ { method: 'bar' } ],
        })
        // check that methods created
        assert.isTrue(ImmutableCore.hasMethod('fooTask.bar'))
        assert.isTrue(ImmutableCore.hasMethod('fooTask.foo'))
    })

    it('should set continueOnError flag for task', async function () {
        var task = new ImmutableCoreTask({
            continueOnError: true,
            methods: { bar: () => {} },
            name: 'foo',
            steps: [ { method: 'bar' } ],
        })
        // check that flag set
        assert.isTrue(task.continueOnError)
    })

    it('should throw error on invalid continueOnError value', async function () {
        assert.throws(() => new ImmutableCoreTask({
            continueOnError: 1,
            methods: { bar: () => {} },
            name: 'foo',
            steps: [ { method: 'bar' } ],
        }), 'ImmutableCoreTask.foo Error: continueOnError must be boolean')
    })

})