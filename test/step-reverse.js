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

describe('immutable-core-task step reverse', function () {

    var sandbox

    beforeEach(function () {
        // reset global data
        ImmutableCore.reset()
        ImmutableCoreTask.reset()
        // create sinon sandbox
        sandbox = sinon.createSandbox()
    })

    afterEach(function () {
        // clear sinon sandbox
        sandbox.restore()
    })

    it('should create step with local reverse method', async function () {
        var task = new ImmutableCoreTask({
            methods: { bar: () => {}, foo: () => {} },
            name: 'foo',
            steps: [ { method: 'bar', reverse: 'foo' } ],
        })
        // check that steps added with default options set
        assert.deepEqual(task.steps, [{
            reverse: { method: 'fooTask.foo' },
            method: 'fooTask.bar',
        }])
    })

    it('should set retry on reverse method', async function () {
        var task = new ImmutableCoreTask({
            methods: { bar: () => {}, foo: () => {} },
            name: 'foo',
            steps: [{
                method: 'bar',
                reverse: { method: 'foo', retry: true },
            }],
        })
        // check that steps added with default options set
        assert.deepEqual(task.steps, [{
            reverse: { method: 'fooTask.foo', retry: { type: 'auto' } },
            method: 'fooTask.bar',
        }])
    })

    it('should throw error if local reverse method not found', async function () {
        assert.throws(() => new ImmutableCoreTask({
            methods: { bar: () => {} },
            name: 'foo',
            steps: [ { method: 'bar', reverse: 'foo' } ],
        }), 'ImmutableCoreTask.foo Error: fooTask.foo method not defined')
    })

    it('should create reverse method with external method', async function () {
        // create external module and method to use
        ImmutableCore.module('fooModule', { foo: () => {} })
        // create task
        var task = new ImmutableCoreTask({
            methods: { bar: () => {} },
            name: 'foo',
            steps: [ { method: 'bar', reverse: 'fooModule.foo' } ],
        })
        // check that steps added with default options set
        assert.deepEqual(task.steps, [{
            reverse: { method: 'fooModule.foo' },
            method: 'fooTask.bar',
        }])
    })

    it('should throw error if external method not found', async function () {
        assert.throws(() => new ImmutableCoreTask({
            methods: { bar: () => {} },
            name: 'foo',
            steps: [ { method: 'bar', reverse: 'fooModule.foo' } ],
        }), 'ImmutableCoreTask.foo Error: fooModule.foo method not defined')
    })

    it('should create task method with external method using ai notation', async function () {
        // create external module and method to use
        ImmutableCore.module('fooModule', { foo: () => {} })
        // create task
        var task = new ImmutableCoreTask({
            methods: { bar: () => {} },
            name: 'foo',
            steps: [ { method: 'bar', reverse: 'module.foo.foo' } ],
        })
        // check that steps added with default options set
        assert.deepEqual(task.steps, [{
            reverse: { method: 'fooModule.foo' },
            method: 'fooTask.bar',
        }])
    })

    it('should throw error if external method not found using ai notation', async function () {
         assert.throws(() => new ImmutableCoreTask({
            methods: { bar: () => {} },
            name: 'foo',
            steps: [ { method: 'bar', reverse: 'module.foo.foo' } ],
        }), 'ImmutableCoreTask.foo Error: fooModule.foo method not defined')
    })

    it('should throw error on invalid reverse method', async function () {
        assert.throws(() => new ImmutableCoreTask({
            methods: { bar: () => {} },
            name: 'foo',
            steps: [ { method: 'bar', reverse: () => {} } ],
        }), 'ImmutableCoreTask.foo Error: reverse must be object or string')
    })

    it('should set input map', async function () {
        var task = new ImmutableCoreTask({
            methods: { bar: () => {}, foo: () => {} },
            name: 'foo',
            steps: [{method: 'bar', reverse: {
                input: {foo: 'bar'},
                method: 'foo',
            }}],
        })
        // check that steps added with default options set
        assert.deepEqual(task.steps, [{
            reverse: {
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
            steps: [{method: 'bar', reverse: {
                input: [],
                method: 'foo',
            }}],
        }), 'ImmutableCoreTask.foo Error: reverse input must be object')
    })

    it('should throw error on invalid input map', async function () {
        assert.throws(() => new ImmutableCoreTask({
            methods: { bar: () => {}, foo: () => {} },
            name: 'foo',
            steps: [{method: 'bar', reverse: {
                input: {foo: {}},
                method: 'foo',
            }}],
        }), 'ImmutableCoreTask.foo Error: reverse input map value must be string')
    })

    it('should set output map', async function () {
        var task = new ImmutableCoreTask({
            methods: { bar: () => {}, foo: () => {} },
            name: 'foo',
            steps: [{method: 'bar', reverse: {
                output: {foo: 'bar'},
                method: 'foo',
            }}],
        })
        // check that steps added with default options set
        assert.deepEqual(task.steps, [{
            reverse: {
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
            steps: [{method: 'bar', reverse: {
                output: [],
                method: 'foo',
            }}],
        }), 'ImmutableCoreTask.foo Error: reverse output must be object')
    })

    it('should throw error on invalid output map', async function () {
        assert.throws(() => new ImmutableCoreTask({
            methods: { bar: () => {}, foo: () => {} },
            name: 'foo',
            steps: [{method: 'bar', reverse: {
                output: {foo: {}},
                method: 'foo',
            }}],
        }), 'ImmutableCoreTask.foo Error: reverse output map value must be string')
    })

    it('should create reverse method with check method', async function () {
        var task = new ImmutableCoreTask({
            methods: { bam: () => {}, bar: () => {}, foo: () => {} },
            name: 'foo',
            steps: [{method: 'bar', reverse: {
                check: 'bam',
                method: 'foo',
                retry: true,
            }}],
        })
        // check that steps added with default options set
        assert.deepEqual(task.steps, [{
            reverse: {
                check: { method: 'fooTask.bam' },
                method: 'fooTask.foo',
                retry: { type: 'auto' },
            },
            method: 'fooTask.bar',
        }])
    })

})