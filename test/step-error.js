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

describe('immutable-core-task step error', function () {

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

    it('should create step with local error method', async function () {
        var task = new ImmutableCoreTask({
            methods: { bar: () => {}, foo: () => {} },
            name: 'foo',
            steps: [ { method: 'bar', error: 'foo' } ],
        })
        // check that steps added with default options set
        assert.deepEqual(task.steps, [{
            error: { method: 'fooTask.foo' },
            method: 'fooTask.bar',
        }])
    })

    it('should set retry on error method', async function () {
        var task = new ImmutableCoreTask({
            methods: { bar: () => {}, foo: () => {} },
            name: 'foo',
            steps: [{
                method: 'bar',
                error: { method: 'foo', retry: true },
            }],
        })
        // check that steps added with default options set
        assert.deepEqual(task.steps, [{
            error: { method: 'fooTask.foo', retry: { type: 'auto' } },
            method: 'fooTask.bar',
        }])
    })

    it('should throw error if local error method not found', async function () {
        assert.throws(() => new ImmutableCoreTask({
            methods: { bar: () => {} },
            name: 'foo',
            steps: [ { method: 'bar', error: 'foo' } ],
        }), 'ImmutableCoreTask.foo Error: fooTask.foo method not defined')
    })

    it('should create error method with external method', async function () {
        // create external module and method to use
        ImmutableCore.module('fooModule', { foo: () => {} })
        // create task
        var task = new ImmutableCoreTask({
            methods: { bar: () => {} },
            name: 'foo',
            steps: [ { method: 'bar', error: 'fooModule.foo' } ],
        })
        // check that steps added with default options set
        assert.deepEqual(task.steps, [{
            error: { method: 'fooModule.foo' },
            method: 'fooTask.bar',
        }])
    })

    it('should throw error if external method not found', async function () {
        assert.throws(() => new ImmutableCoreTask({
            methods: { bar: () => {} },
            name: 'foo',
            steps: [ { method: 'bar', error: 'fooModule.foo' } ],
        }), 'ImmutableCoreTask.foo Error: fooModule.foo method not defined')
    })

    it('should create task method with external method using ai notation', async function () {
        // create external module and method to use
        ImmutableCore.module('fooModule', { foo: () => {} })
        // create task
        var task = new ImmutableCoreTask({
            methods: { bar: () => {} },
            name: 'foo',
            steps: [ { method: 'bar', error: 'module.foo.foo' } ],
        })
        // check that steps added with default options set
        assert.deepEqual(task.steps, [{
            error: { method: 'fooModule.foo' },
            method: 'fooTask.bar',
        }])
    })

    it('should throw error if external method not found using ai notation', async function () {
         assert.throws(() => new ImmutableCoreTask({
            methods: { bar: () => {} },
            name: 'foo',
            steps: [ { method: 'bar', error: 'module.foo.foo' } ],
        }), 'ImmutableCoreTask.foo Error: fooModule.foo method not defined')
    })

    it('should throw error on invalid error method', async function () {
        assert.throws(() => new ImmutableCoreTask({
            methods: { bar: () => {} },
            name: 'foo',
            steps: [ { method: 'bar', error: () => {} } ],
        }), 'ImmutableCoreTask.foo Error: error must be object or string')
    })

    it('should set input map', async function () {
        var task = new ImmutableCoreTask({
            methods: { bar: () => {}, foo: () => {} },
            name: 'foo',
            steps: [{method: 'bar', error: {
                input: {foo: 'bar'},
                method: 'foo',
            }}],
        })
        // check that steps added with default options set
        assert.deepEqual(task.steps, [{
            error: {
                input: {foo: 'bar'},
                method: 'fooTask.foo',
            },
            method: 'fooTask.bar',
        }])
    })

    it('should throw error on invalid input map', async function () {
        assert.throws(() => new ImmutableCoreTask({
            methods: { bar: () => {}, foo: () => {} },
            name: 'foo',
            steps: [{method: 'bar', error: {
                input: [],
                method: 'foo',
            }}],
        }), 'ImmutableCoreTask.foo Error: error input must be object')
    })

    it('should throw error on invalid input map', async function () {
        assert.throws(() => new ImmutableCoreTask({
            methods: { bar: () => {}, foo: () => {} },
            name: 'foo',
            steps: [{method: 'bar', error: {
                input: {foo: {}},
                method: 'foo',
            }}],
        }), 'ImmutableCoreTask.foo Error: error input map value must be string')
    })

    it('should set output map', async function () {
        var task = new ImmutableCoreTask({
            methods: { bar: () => {}, foo: () => {} },
            name: 'foo',
            steps: [{method: 'bar', error: {
                output: {foo: 'bar'},
                method: 'foo',
            }}],
        })
        // check that steps added with default options set
        assert.deepEqual(task.steps, [{
            error: {
                output: {foo: 'bar'},
                method: 'fooTask.foo',
            },
            method: 'fooTask.bar',
        }])
    })

    it('should throw error on invalid output map', async function () {
        assert.throws(() => new ImmutableCoreTask({
            methods: { bar: () => {}, foo: () => {} },
            name: 'foo',
            steps: [{method: 'bar', error: {
                output: [],
                method: 'foo',
            }}],
        }), 'ImmutableCoreTask.foo Error: error output must be object')
    })

    it('should throw error on invalid output map', async function () {
        assert.throws(() => new ImmutableCoreTask({
            methods: { bar: () => {}, foo: () => {} },
            name: 'foo',
            steps: [{method: 'bar', error: {
                output: {foo: {}},
                method: 'foo',
            }}],
        }), 'ImmutableCoreTask.foo Error: error output map value must be string')
    })

    it('should create error method with check method', async function () {
        var task = new ImmutableCoreTask({
            methods: { bam: () => {}, bar: () => {}, foo: () => {} },
            name: 'foo',
            steps: [{method: 'bar', error: {
                check: 'bam',
                method: 'foo',
                retry: true,
            }}],
        })
        // check that steps added with default options set
        assert.deepEqual(task.steps, [{
            error: {
                check: { method: 'fooTask.bam' },
                method: 'fooTask.foo',
                retry: { type: 'auto' },
            },
            method: 'fooTask.bar',
        }])
    })

    it('should throw error on error check method when no retry', async function () {
        assert.throws(() => new ImmutableCoreTask({
            methods: { bam: () => {}, bar: () => {}, foo: () => {} },
            name: 'foo',
            steps: [{method: 'bar', error: {
                check: 'bam',
                method: 'foo',
            }}],
        }), 'ImmutableCoreTask.foo Error: error retry must be true when check method set')
    })

    it('should set continueOnError flag for step', async function () {
        var task = new ImmutableCoreTask({
            methods: { bar: () => {}, foo: () => {} },
            name: 'foo',
            steps: [ { method: 'bar', error: 'foo', continueOnError: true } ],
        })
        // check that steps added with default options set
        assert.deepEqual(task.steps, [{
            continueOnError: true,
            error: { method: 'fooTask.foo' },
            method: 'fooTask.bar',
        }])
    })

    it('should throw error on invalid continueOnError value', async function () {
        assert.throws(() => new ImmutableCoreTask({
            methods: { bar: () => {}, foo: () => {} },
            name: 'foo',
            steps: [ { method: 'bar', error: 'foo', continueOnError: 1 } ],
        }), 'ImmutableCoreTask.foo Error: continueOnError must be boolean')
    })

})