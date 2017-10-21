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

describe('immutable-core-task step', function () {

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

    it('should not have default async', async function () {
        var task = new ImmutableCoreTask({
            methods: { bar: () => {} },
            name: 'foo',
            steps: [ { method: 'bar' } ],
        })
        // check that steps added with default options set
        assert.deepEqual(task.steps, [ { method: 'fooTask.bar' } ])
    })

    it('should set async:true', async function () {
        var task = new ImmutableCoreTask({
            methods: { bar: () => {} },
            name: 'foo',
            steps: [ { async: true, method: 'bar' } ],
        })
        // check that steps added with default options set
        assert.deepEqual(task.steps, [ { async: true, method: 'fooTask.bar' } ])
    })

    it('should set async:false', async function () {
        var task = new ImmutableCoreTask({
            methods: { bar: () => {} },
            name: 'foo',
            steps: [ { async: false, method: 'bar' } ],
        })
        // check that steps added with default options set
        assert.deepEqual(task.steps, [ { async: false, method: 'fooTask.bar' } ])
    })

    it('should throw error on invalid async value', async function () {
        assert.throws(() => new ImmutableCoreTask({
            methods: { bar: () => {} },
            name: 'foo',
            steps: [ { async: 1, method: 'bar' } ],
        }), 'ImmutableCoreTask.foo Error: async must be boolean')
    })

    it('should throw error on missing steps', async function () {
        assert.throws(() => new ImmutableCoreTask({
            name: 'foo',
        }), 'ImmutableCoreTask.foo Error: steps must be array')
    })

    it('should throw error on non-array steps', async function () {
        assert.throws(() => new ImmutableCoreTask({
            name: 'foo',
            steps: {},
        }), 'ImmutableCoreTask.foo Error: steps must be array')
    })

    it('should throw error if no steps in array ', async function () {
        assert.throws(() => new ImmutableCoreTask({
            name: 'foo',
            steps: [],
        }), 'ImmutableCoreTask.foo Error: task must have at least one step')
    })

})