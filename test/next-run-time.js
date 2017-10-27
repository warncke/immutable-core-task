'use strict'

/* npm modules */
const chai = require('chai')
const moment = require('moment')
const sinon = require('sinon')

/* application modules */
const ImmutableCoreTaskInstance = require('../lib/immutable-core-task-instance')

/* chai config */
const assert = chai.assert
sinon.assert.expose(chai.assert, { prefix: '' })

describe('immutable-core-task nextRunTime', function () {

    // create new instance with dummy record
    var instance = new ImmutableCoreTaskInstance({
        record: {},
        task: {
            ImmutableCoreTask: true,
        },
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

    it('should format duration starting with +', function () {
        // get current time
        var currentTime = moment.utc().add({
            days: 1,
            hours: 23,
            minutes: 13,
        })
        // get next run time from duration
        var nextRunTime = instance.nextRunTime('+1d23h13m')
        // check for match or match on next second in case clock switched
        assert.ok(currentTime.format('YYYY-MM-DD HH:mm:ss') === nextRunTime || currentTime.add(1, 'seconds').format('YYYY-MM-DD HH:mm:ss') === nextRunTime)
    })

    it('should throw error on invalid duration', function () {
        assert.throws(() => {
            instance.nextRunTime('+1x')
        }, 'ImmutableCoreTaskInstance Error: invalid time +1x')
    })
})