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

describe('immutable-core-task step method', function () {

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

    it('should create task method with local method', async function () {
        var task = new ImmutableCoreTask({
            methods: { bar: () => {} },
            name: 'foo',
            steps: [ { method: 'bar' } ],
        })
        // check that steps added with default options set
        assert.deepEqual(task.steps, [ { method: 'fooTask.bar' } ])
    })

    it('should set retry on method', async function () {
        var task = new ImmutableCoreTask({
            methods: { bar: () => {} },
            name: 'foo',
            steps: [ { method: 'bar', retry: true } ],
        })
        // check that steps added with default options set
        assert.deepEqual(task.steps, [{
            method: 'fooTask.bar',
            retry: {type: 'auto'},
        }])
    })

    it('should throw error if local method not found', async function () {
        assert.throws(() => new ImmutableCoreTask({
            name: 'foo',
            steps: [ { method: 'bar', retry: true } ],
        }), 'ImmutableCoreTask.foo Error: fooTask.bar method not defined')
    })

    it('should create task method with external method', async function () {
        // create external module and method to use
        ImmutableCore.module('barModule', { bar: () => {} })
        // create task that uses bar module
        var task = new ImmutableCoreTask({
            name: 'foo',
            steps: [ { method: 'barModule.bar' } ],
        })
        // check that steps added with default options set
        assert.deepEqual(task.steps, [ { method: 'barModule.bar' } ])
    })

    it('should throw error if external method not found', async function () {
        assert.throws(() => new ImmutableCoreTask({
            name: 'foo',
            steps: [ { method: 'barModule.bar' } ],
        }), 'ImmutableCoreTask.foo Error: barModule.bar method not defined')
    })

    it('should create task method with external method using ai notation', async function () {
        // create external module and method to use
        ImmutableCore.module('barModule', { bar: () => {} })
        // create task that uses bar module
        var task = new ImmutableCoreTask({
            name: 'foo',
            steps: [ { method: 'module.bar.bar' } ],
        })
        // check that steps added with default options set
        assert.deepEqual(task.steps, [ { method: 'barModule.bar' } ])
    })

    it('should throw error if external method not found using ai notation', async function () {
        assert.throws(() => new ImmutableCoreTask({
            name: 'foo',
            steps: [ { method: 'module.bar.bar' } ],
        }), 'ImmutableCoreTask.foo Error: barModule.bar method not defined')
    })

    it('should throw error on invalid step method', async function () {
        assert.throws(() => new ImmutableCoreTask({
            name: 'foo',
            steps: [ { method: () => {} } ],
        }), 'ImmutableCoreTask.foo Error: method must be string')
    })

    it('should set input map', async function () {
        var task = new ImmutableCoreTask({
            methods: { bar: () => {} },
            name: 'foo',
            steps: [ { input: {foo: 'bar'}, method: 'bar' } ],
        })
        // check that steps added with default options set
        assert.deepEqual(task.steps, [{
            method: 'fooTask.bar',
            input: {foo: 'bar'},
        }])
    })

    it('should throw error on invalid input map', async function () {
        assert.throws(() => new ImmutableCoreTask({
            methods: { bar: () => {} },
            name: 'foo',
            steps: [ { input: [], method: 'bar' } ],
        }), 'ImmutableCoreTask.foo Error: step input must be object')
    })

    it('should throw error on invalid input map', async function () {
        assert.throws(() => new ImmutableCoreTask({
            methods: { bar: () => {} },
            name: 'foo',
            steps: [ { input: {foo: {}}, method: 'bar' } ],
        }), 'ImmutableCoreTask.foo Error: step input map value must be string')
    })

    it('should set output map', async function () {
        var task = new ImmutableCoreTask({
            methods: { bar: () => {} },
            name: 'foo',
            steps: [ { output: {foo: 'bar'}, method: 'bar' } ],
        })
        // check that steps added with default options set
        assert.deepEqual(task.steps, [{
            method: 'fooTask.bar',
            output: {foo: 'bar'},
        }])
    })

    it('should throw error on invalid output map', async function () {
        assert.throws(() => new ImmutableCoreTask({
            methods: { bar: () => {} },
            name: 'foo',
            steps: [ { output: [], method: 'bar' } ],
        }), 'ImmutableCoreTask.foo Error: step output must be object')
    })

    it('should throw error on invalid output map', async function () {
        assert.throws(() => new ImmutableCoreTask({
            methods: { bar: () => {} },
            name: 'foo',
            steps: [ { output: {foo: {}}, method: 'bar' } ],
        }), 'ImmutableCoreTask.foo Error: step output map value must be string')
    })

})