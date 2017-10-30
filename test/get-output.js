'use strict'

/* npm modules */
const chai = require('chai')

/* application modules */
const ImmutableCoreTaskInstance = require('../lib/immutable-core-task-instance')

/* chai config */
const assert = chai.assert

describe('immutable-core-task-instance getOutput', function () {

    var getOutput = ImmutableCoreTaskInstance.prototype.getOutput

    it('should map input', function () {
        var origOutput = {
            foo: { bar: 1 },
            bam: true,
            baz: false,
        }

        var map = {
            'foo.bar': 'bam.baz',
            'baz': 'baz',
        }

        var expected = {
            bam: { baz: 1 },
            baz: false,
        }

        assert.deepEqual(getOutput(origOutput, map), expected)
    })
})