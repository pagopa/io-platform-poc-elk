# Load tests for IO-Payment-updater project

This is a set of [k6](https://k6.io) load tests related to the Payment Updater component.

All tests require a set of parameters: **rate**, **duration**, **preAllocatedVUs** and **maxVUs**. These parameters are necessary to set the test target to a given number of iteration per second (**rate**) in a given time (**duration**), using a certain number of VUs (**preAllocatedVUs** and **maxVUs**).

To invoke k6 load test passing parameter use -e (or --env) flag:

```
-e MY_VARIABLE=MY_VALUE
```

Let's keep in mind that before perform a load test you have to:

- run `yarn install`
- run `yarn webpack`

## 01. New Payment Producer

This test produce a Payment

```
$ docker run -i --rm -v $(pwd)/dist:/dist  -e PRODUCER_BASE_URL=${PRODUCER_BASE_URL} -e rate=${rate} -e duration=${duration} -e preAllocatedVUs=${preAllocatedVUs} -e maxVUs=${maxVUs} loadimpact/k6 run /dist/producer_newpayment.js
```

## 02. Payment check.

Payment check test

```
$ docker run -i --rm -v $(pwd)/dist:/dist  -e PU_BASE_URL=${PU_BASE_URL} -e rate=${rate} -e duration=${duration} -e preAllocatedVUs=${preAllocatedVUs} -e maxVUs=${maxVUs} loadimpact/k6 run /dist/payment_check.js
```

# Full workloads

## 01. Payment with Related Messages

This test represents payment messages lifecycle through Payment Updater.

```
$ docker run -i --rm -v $(pwd)/dist:/dist -e PRODUCER_BASE_URL=${PRODUCER_BASE_URL} -e PU_BASE_URL=${PU_BASE_URL} -e API_ENVIRONMENT=${API_ENVIRONMENT} -e -e API_SUBSCRIPTION_KEY=${API_SUBSCRIPTION_KEY} -e rate=${rate} -e duration=${duration} -e preAllocatedVUs=${preAllocatedVUs} -e maxVUs=${maxVUs} loadimpact/k6 run /dist/message_payments.js
```
