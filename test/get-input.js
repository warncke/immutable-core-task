'use strict'

/* npm modules */
const chai = require('chai')

/* application modules */
const ImmutableCoreTaskInstance = require('../lib/immutable-core-task-instance')

/* chai config */
const assert = chai.assert

describe('immutable-core-task-instance getInput', function () {

    var getInput = ImmutableCoreTaskInstance.prototype.getInput

    it('should map input', function () {
        var origInput = {
            foo: { bar: 1 },
            bam: true,
            baz: false,
            session: 'session',
        }

        var map = {
            'foo.bar': 'bam.baz',
            'baz': 'baz',
        }

        var expected = {
            bam: { baz: 1 },
            baz: false,
            session: 'session',
        }

        assert.deepEqual(getInput(origInput, map), expected)
    })
})