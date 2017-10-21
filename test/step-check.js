'use strict'

/* npm modules */
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

describe('immutable-core-task step check', function () {

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

    it('should create step with local check method', async function () {
        var task = new ImmutableCoreTask({
            methods: { bar: () => {}, foo: () => {} },
            name: 'foo',
            steps: [ { method: 'bar', check: 'foo', retry: true } ],
        })
        // check that steps added with default options set
        assert.deepEqual(task.steps, [{
            check: { method: 'fooTask.foo' },
            method: 'fooTask.bar',
            retry: { type: 'auto' },
        }])
    })

    it('should set retry on check method', async function () {
        var task = new ImmutableCoreTask({
            methods: { bar: () => {}, foo: () => {} },
            name: 'foo',
            steps: [{
                check: { method: 'foo', retry: true },
                method: 'bar',
                retry: true,
            }],
        })
        // check that steps added with default options set
        assert.deepEqual(task.steps, [{
            check: { method: 'fooTask.foo', retry: { type: 'auto' } },
            method: 'fooTask.bar',
            retry: { type: 'auto' },
        }])
    })

    it('should throw error if local check method not found', async function () {
        assert.throws(() => new ImmutableCoreTask({
            methods: { bar: () => {} },
            name: 'foo',
            steps: [ { method: 'bar', check: 'foo', retry: true } ],
        }), 'ImmutableCoreTask.foo Error: fooTask.foo method not defined')
    })

    it('should create check method with external method', async function () {
        // create external module and method to use
        ImmutableCore.module('fooModule', { foo: () => {} })
        // create task
        var task = new ImmutableCoreTask({
            methods: { bar: () => {} },
            name: 'foo',
            steps: [ { method: 'bar', check: 'fooModule.foo', retry: true } ],
        })
        // check that steps added with default options set
        assert.deepEqual(task.steps, [{
            check: { method: 'fooModule.foo' },
            method: 'fooTask.bar',
            retry: { type: 'auto' },
        }])
    })

    it('should throw error if external method not found', async function () {
        assert.throws(() => new ImmutableCoreTask({
            methods: { bar: () => {} },
            name: 'foo',
            steps: [ { method: 'bar', check: 'fooModule.foo', retry: true } ],
        }), 'ImmutableCoreTask.foo Error: fooModule.foo method not defined')
    })

    it('should create task method with external method using ai notation', async function () {
        // create external module and method to use
        ImmutableCore.module('fooModule', { foo: () => {} })
        // create task
        var task = new ImmutableCoreTask({
            methods: { bar: () => {} },
            name: 'foo',
            steps: [ { method: 'bar', check: 'module.foo.foo', retry: true } ],
        })
        // check that steps added with default options set
        assert.deepEqual(task.steps, [{
            check: { method: 'fooModule.foo' },
            method: 'fooTask.bar',
            retry: { type: 'auto' },
        }])
    })

    it('should throw error if external method not found using ai notation', async function () {
         assert.throws(() => new ImmutableCoreTask({
            methods: { bar: () => {} },
            name: 'foo',
            steps: [ { method: 'bar', check: 'module.foo.foo', retry: true } ],
        }), 'ImmutableCoreTask.foo Error: fooModule.foo method not defined')
    })

    it('should throw error on invalid check method', async function () {
        assert.throws(() => new ImmutableCoreTask({
            methods: { bar: () => {} },
            name: 'foo',
            steps: [ { method: 'bar', check: () => {}, retry: true } ],
        }), 'ImmutableCoreTask.foo Error: step check must be object or string')
    })

})