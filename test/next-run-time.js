'use strict'

/* npm modules */
const ImmutableAI = require('immutable-ai')
const ImmutableCore = require('immutable-core')
const ImmutableDatabaseMariaSQL = require('immutable-database-mariasql')
const ImmutableGlobal = require('immutable-global')
const ImmutableCoreModel = require('immutable-core-model')
const Promise = require('bluebird')
const chai = require('chai')
const moment = require('moment')
const sinon = require('sinon')

/* application modules */
const ImmutableCoreTask = require('../lib/immutable-core-task')
const ImmutableCoreTaskInstance = require('../lib/immutable-core-task-instance')

/* chai config */
const assert = chai.assert
sinon.assert.expose(chai.assert, { prefix: '' })

const dbHost = process.env.DB_HOST || 'localhost'
const dbName = process.env.DB_NAME || 'test'
const dbPass = process.env.DB_PASS || ''
const dbUser = process.env.DB_USER || 'root'

const connectionParams = {
    charset: 'utf8',
    db: dbName,
    host: dbHost,
    password: dbPass,
    user: dbUser,
}

describe('immutable-core-task-instance nextRunTime', function () {

    var fooTask, instance, instanceModel, instanceModelGlboal, taskModel,
        taskModelGlobal

    // create database connection to use for testing
    var database = new ImmutableDatabaseMariaSQL(connectionParams)
    // fake session to use for testing
    var session = {
        accountId: '11111111111111111111111111111111',
        roles: ['all', 'authenticated'],
        sessionId: '22222222222222222222222222222222',
    }

    before(async function () {
        // reset global data
        ImmutableCore.reset()
        ImmutableCoreModel.reset()
        ImmutableGlobal.reset()
        // drop any test tables if they exist
        await database.query('DROP TABLE IF EXISTS task')
        await database.query('DROP TABLE IF EXISTS taskInstance')
        // create task model
        taskModelGlobal = new ImmutableCoreModel({
            columns: {
                name: {
                    immutable: true,
                    type: 'string',
                    unique: true,
                },
            },
            database: database,
            name: 'task',
        })
        // create instance model
        instanceModelGlboal = new ImmutableCoreModel({
            columns: {
                nextRunTime: {
                    index: true,
                    null: true,
                    type: 'time',
                },
                taskId: {
                    index: true,
                    null: false,
                    type: 'id',
                },
            },
            database: database,
            name: 'taskInstance',
        })
        // sync models
        await taskModelGlobal.sync()
        await instanceModelGlboal.sync()
        // get local models
        taskModel = taskModelGlobal.session(session)
        instanceModel = instanceModelGlboal.session(session)
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
        // create new instance
        instance = await fooTask.new()
    })

    after(function () {
        database.close()
    })

    it('should return current time with no args', function () {
        assert.match(instance.nextRunTime(), /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
    })

    it('should return mysql formatted time string', function () {
        assert.match(instance.nextRunTime('2001-01-01 01:01:01'), '2001-01-01 01:01:01')
    })

    it('should take string in other format', function () {
        assert.match(instance.nextRunTime('Wed Oct 25 2017 21:10:07 GMT-0400 (AST)'), '2017-10-26 01:10:07')
    })

    it('should throw error on invalid time', function () {
        assert.throws(() => {
            instance.nextRunTime('xxx')
        }, 'ImmutableCoreTaskInstance Error: invalid time xxx')
    })

    it('should format Date object', function () {
        assert.match(instance.nextRunTime(new Date('Wed Oct 25 2017 21:10:07 GMT-0400 (AST)')), '2017-10-26 01:10:07')
    })

    it('should format moment object', function () {
        assert.match(instance.nextRunTime(moment.utc('2017-10-26 01:10:07')), '2017-10-26 01:10:07')
    })

    it('should format duration', function () {
        // get current time
        var currentTime = moment.utc().add({
            days: 1,
            hours: 23,
            minutes: 13,
        })
        // get next run time from duration
        var nextRunTime = instance.nextRunTime('1d23h13m')
        // check for match or match on next second in case clock switched
        assert.ok(currentTime.format('YYYY-MM-DD HH:mm:ss') === nextRunTime || currentTime.add(1, 'seconds').format('YYYY-MM-DD HH:mm:ss') === nextRunTime)
    })

    it('should throw error on invalid duration', function () {
        assert.throws(() => {
            instance.nextRunTime('1x')
        }, 'ImmutableCoreTaskInstance Error: invalid time 1x')
    })
})