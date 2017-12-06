# immutable-core-task

Immutable Core Task integrates with the
[Immutable App](https://www.npmjs.com/package/immutable-app) ecosystem
to provide a mechanism for defining multi-step tasks that run outside the
context of a single process.

## Defining a task

    const orderTask = new ImmutableCoreTask({
        data: {
            foo: true,
        },
        methods: {
            capturePayment: capturePayment,
            checkDeliveryStatus: checkDeliveryStatus,
            checkInventoryAvailability: checkInventoryAvailability,
            fulfilOrder: fulfilOrder,
            refundPayment: refundPayment,
        },
        name: 'order',
        steps: [
            {
                method: 'module.email.orderReceived',
            },
            {
                error: 'module.email.inventoryUnavailable',
                method: 'checkInventoryAvailability',
            },
            {
                error: 'module.email.verifyPaymentDetails',
                method: 'capturePayment',
                reverse: 'refundPayment'
            },
            {
                error: 'module.email.orderCanceled',
                method: 'fulfilOrder',
            },
            {
                method: 'module.email.orderShipped',
            },
            {
                error: 'task.deliveryException.new',
                method: 'checkDeliveryStatus',
            },
            {
                method: 'module.email.orderDelivered',
            },
            {
                method: 'completeOrder',
            }
        ],
    })

In this example a simple order processing flow is mocked out.

Every task must have a `name` which will be used to create an Immutable Core
Module with the name `${name}Task` (e.g. `fooTask`).

A task may have default `data` specified. The args passed when creating a new
task instance will be merged over this `data`.

Every task must have one or more `steps`.

Each step in the flow will be executed in order.

Each step must have a `method` which is the code that will be executed for the
step.

The `method` can be a reference to a method defined on the task itself like
`authorizeCreditCard` or it can be a reference to a method on another
[Immutable Core](https://www.npmjs.com/package/immutable-core) module like
`module.email.orderReceived`.

A task step can also initiate another task like `task.deliveryException.new`.

The `error` method specified for a step is called if the `method` for a step
has an error.

If an error on any step occurs then any `reverse` methods on completed steps
prior to the error will be executed in reverse order.

## Tasks vs. transactions

In a traditional database a transaction is used to insure that multiple data
modifications are all committed at the same time.

Tasks are similar to transactions in that they are designed to provide reliable
completion of multi-step tasks and defined behaviors when errors occur.

A major difference between a task and a transaction is that transactions only
work within the context of a single database.

Tasks are designed to facilitate multi-step processes that span multiple
databases and multiple systems both internal and external.

Unlike transactions every step in a task will be committed as soon as it is
complete. If a completed step needs to be reversed due to an error on a later
step the reverse method must be explicitly defined.

## Creating a new task instance

    await ImmutableCoreTask.task('order').new({...})

To execute a task the `new` method is called. The arguments to `new` provide
the initial context for the task.

The `session` that is passed to `new` will be the session that is used for
executing all of the methods in the tasks steps so the access control for those
methods and anything they do will be based on the `session` that the task was
initialized with.

    await this.task.order.new({...})

From inside a controller or any other Immutable Core Module the
[Immutable AI](https://www.npmjs.com/package/immutable-ai) instance bound
to `this` is the best way to create a new task.

## Task execution

When a new task instance is created the task instance will be saved using the
[Immutable Core Model](https://www.npmjs.com/package/immutable-core-model)
`task`.

The `task` model, the task runner, and task administration are all defined in
the [Immutable App Task](https://www.npmjs.com/package/immutable-app-task)
module.

As soon as the `task` record is saved the `new` task instance will be returned.

Once the `task` is saved it will be picked up and executed by the next
available task runner.

### Task step execution

Whenever a task is saved a `nextRunTime` value will be set. When a new task
instance is created the `nextRunTime` will be the current time unless it is
specifically scheduled for the future.

Task runners will process tasks in order of their `nextRunTime` once that time
is reached.

When a task runner selects a task to execute it will update the task data with
the step that it intends to execute and the information about the task runner
and then set a new `nextRunTime` based on a `timeout` value.

If the task runner completes the step, with either a success or failure, it
will update the task record with the result.

If there is another step that can be executed immediately then the same task
runner will execute the next step.

If there is another step that is scheduled to execute in the future then the
task runner will move on to other tasks.

If the task runner does not complete the execution of the step before the
timeout and the `nextRunTime` is reached then another task runner will pick up
the task and attempt to complete it.

## Error handling

### Task ignoreError

    const orderTask = new ImmutableCoreTask({
        ignoreError: true
    })

When `ignoreError` is set to true then tasks will continue to process and
will be completed successfully even if one or more steps fail.

This option is false by default.

Setting `ignoreError` true for the task means that errors on any step will
not prevent the task from completing successfully unless `ignoreError` is
set to false for specific steps.

### Step ignoreError

    const orderTask = new ImmutableCoreTask({
        steps: [
            {
                ignoreError: true,
                method: 'module.email.orderReceived',
                retry: true,
            },
        ],
    })

Any `ignoreError` option set at the step level will override the task level
configuration.

When `ignoreError` is used with `retry` processing of later steps will not
continue until after all retry attempts have been made.

### Retry

    const orderTask = new ImmutableCoreTask({
        steps: [
            {
                method: 'module.email.orderReceived',
                retry: true,
            },
        ],
    })

In many cases, especially where a step involves a network request, it is
desirable to retry the step if an error occurs.

When `retry` is set to `true` the task runner will retry the step at least
once and may retry the step multiple times based on the type of error.

If a step has an `error` method and `retry` is enabled the error method will
only be called if all retry attempts fail.

`retry` can also be specified for `check`, `error` and `reverse` methods.

### Retry all

    const orderTask = new ImmutableCoreTask({
        retry: true,
        steps: [
            {
                method: 'module.email.orderReceived',
            },
        ],
    })

When `retry` is set to true in the top level task args all methods will have
`retry` set to true.

### Check

    const orderTask = new ImmutableCoreTask({
        steps: [
            {
                check: 'module.email.wasOrderReceivedSent',
                retry: true,
            },
        ],
    })

It is possible that after a step completes successfully an error occurs that
prevents that success from being recorded in the database.

A `check` method can be specified that checks if the step has already been
completed.

The `check` method will be called with the same arguments that the step method
was called with unless a custom `input` map is specified.

If the `check` method resolves with a value then the step will be marked as
complete without retrying it again.

If `check` returns a value that value will be only be merged into the task
`data` if an `output` map is defined.

If the `check` method encounters an error then the step enters an error state,
the `method` will not be retried, and the `error` method will be called if
it is defined.

The `check` method can only be called when doing a retry so `retry` must be
enabled for a check method to be defined.

### Check retry

    const orderTask = new ImmutableCoreTask({
        steps: [
            {
                check: {
                    method: 'module.email.wasOrderReceivedSent',
                    retry: true,
                },
                retry: true,
            },
        ],
    })

### Error

    const orderTask = new ImmutableCoreTask({
        steps: [
            {
                error: 'module.email.orderCanceled',
                retry: true,
            },
        ],
    })

The `error` method specifies the action to take if the step method encounters
an error.

If retry is enabled then the error method will only be called once after all
retry attempts have failed.

If retry is not enabled then the error method will be called immediately.

If the error method itself encounters an error then the task enters an error
state and it will be marked as failed unless the `ignoreError` option is
specified.

The error method will be called with the same args as the step method unless an
`input` map is specified. The `error` will always be added to the args.

If `error` returns a value that value will be only be merged into the task
`data` if an `output` map is defined.

### Error retry

    const orderTask = new ImmutableCoreTask({
        steps: [
            {
                error: {
                    method: 'module.email.orderCanceled',
                    retry: true,
                },
            },
        ],
    })

### Error retry with check

    const orderTask = new ImmutableCoreTask({
        steps: [
            {
                error: {
                    check: 'module.email.wasOrderCanceledEmailSent',
                    method: 'module.email.orderCanceled',
                    retry: true,
                },
            },
        ],
    })

If `retry` is enabled then the error method can have its own `check` method that
works exactly the same as the step `check` method.

The `check` method will be called with custom arguments if it has an `input`
map defined. Otherwise it will fall back to the `error` or `method` arguments.

If `check` returns a value that value will be only be merged into the task
`data` if an `output` map is defined.

### Error retry with check retry

    const orderTask = new ImmutableCoreTask({
        steps: [
            {
                error: {
                    check: {
                        method: 'module.email.wasOrderCanceledEmailSent',
                        retry: true,
                    },
                    method: 'module.email.orderCanceled',
                    retry: true,
                },
            },
        ],
    })

### Reverse

    const orderTask = new ImmutableCoreTask({
        steps: [
            {
                reverse: 'refundPayment',
            },
        ],
    })

The `reverse` method will be called if the step it is defined for completed
successfully but a later step encountered an error.

The `reverse` method will be called with the same arguments as the step method
unless an `input` map is specified.

If `reverse` returns a value that value will be only be merged into the task
`data` if an `output` map is defined.

### Reverse retry

    const orderTask = new ImmutableCoreTask({
        steps: [
            {
                reverse: {
                    method: 'refundPayment',
                    retry: true,
                }
            },
        ],
    })

### Reverse retry with check

    const orderTask = new ImmutableCoreTask({
        steps: [
            {
                reverse: {
                    check: 'wasPaymendRefunded',
                    method: 'refundPayment',
                    retry: true,
                }
            },
        ],
    })

If `retry` is enabled then the `reverse` method can have its own `check` method
that works exactly the same as the step `check` method.

The `check` method will be called with custom arguments if it has an `input`
map defined. Otherwise it will fall back to the `reverse` or `method` arguments.

If `check` returns a value that value will be only be merged into the task
`data` if an `output` map is defined.

### Reverse retry with check retry

    const orderTask = new ImmutableCoreTask({
        steps: [
            {
                reverse: {
                    check: {
                        method: 'wasPaymendRefunded',
                        retry: true
                    },
                    method: 'refundPayment',
                    retry: true,
                }
            },
        ],
    })

## Method call args

By default every step `method` will be called with the task `data` which
includes the `session` that the task instance was created with.

Any data that is returned by the method will be merged into the task data.

### Setting specific method args

    const orderTask = new ImmutableCoreTask({
        steps: [
            {
                input: {
                    foo: 'bar',
                    'foo.bam': 'baz.bam',
                },
                method: 'module.email.orderReceived',
            },
        ],
    })

When integrating internal and external systems it will often be necesary to
perform a mapping between different data properties.

The `input` object will be used to get and set the properties that are used for
each method call.

The key property in the input map (e.g. `foo`, `foo.bam`) is used to lookup the
value from the task value and the value in the input map is used to set the
value for the method args.

    input: {dataProperty: 'argsProperty'}

Properties are resolved using lodash `_.get` and `_.set` so deeply nested
values can be retrieved.

The `session` is always included with every method call so it does not need to
be explicitly specified.

### Setting specific method return data

    const orderTask = new ImmutableCoreTask({
        steps: [
            {
                method: 'module.email.orderReceived',
                output: {
                    bar: 'foo',
                    'baz.bam': 'foo.bam',
                },
            },
        ],
    })

The `output` map works similarly to the `input` map with the major difference
being that the key property is for the return data and the value property is
for the task data.

    output: {returnProperty: 'dataProperty'}

If `output` is defined then only the properties in the output map will be
merged into the task data.

## Task runner

    var task = new ImmutableCoreTaskInstance({record: record})

    await taskInstance.run()

The task runner loads task instance records where the `nextRunTime` is less than
or equal to the current time and then instantiates an ImmutableCoreTaskInstance
from the record.

The task runner then calls `run` which will run as many steps as possible until
the task either finishes or hits a break, such as waiting to retry after an
error.

## Task schema

    {
        data: {},
        name: 'taskName',
        steps: [
            { ... },
        ],
    }

ImmutableCoreTasks are persisted using the ImmutableCoreModel specified by
`taskModel`.

The `sync` method is used to make sure the current task definition is persisted
to the database.

When a task instance is executed the `taskId` will be used to fetch the version
of the task that the instance was created with.

If the steps in a task are changed all current task instances will run the task
steps that they were created with.

## Task instance schema

    {
        data: {},
        nextRunTime: '2001-01-01 01:01:01',
        status: {
            complete: false,
            running: false,
            step: 0,
            success: false,
        },
        taskId: '<hex task id>',
        taskName: 'foo',
    }

When a new task instance is created it will be persisted using
the ImmutableCoreModel specified by `instanceModel`.

The `status` object is used to track the status of task instance execution.

The `status` object changes from one execution run to the next and not all
properties will always be present but the complete history of the task instance
execution can always be retrieved by looking at the history of the instance
revisions.

`nextRunTime` will either have the next scheduled run time for execution of the
task or will be `NULL` if task execution has completed.

### Status properties

| name          | type      | description                                      |
|---------------|-----------|--------------------------------------------------|
| complete      | boolean   | set true when task instance execution complete   |
| error         | object    | record of sub-step errors                        |
| retry         | boolean   | set true when next step should be retry of last  |
| reverse       | boolean   | set to true if running reverse method(s)         |
| running       | boolean   | true when step is being executed                 |
| subStep       | string    | sub-step name: method, check, error, etc         |
| step          | object    | specification of current step                    |
| stepNum       | integer   | number of current step - starting at zero        |
| success       | boolean   | set true if complete without unhandled errors    |
| successOrig   | boolean   | original success value before running reverse    |
| try           | object    | record of try counts for sub-steps               |

### Running first step of task

    {
        running: true,
        step: 0,
    }

The `run` method will update the `status` of the task instance to
`running: true` and update `nextRunTime` to the `timeout` value for the step.
