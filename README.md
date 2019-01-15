mongo-aws-xray
==============

## Installation

```sh
npm i mongo-aws-xray
```

Note that this currently only works with mongojs.


## Usage

`mongo-aws-xray` can be used in the same manner as
[aws-xray-sdk-mysql](https://www.npmjs.com/package/aws-xray-sdk-mysql). You wrap
the constructor with `captureMongo` and then create away!

```js
const { captureMongo } = require('mongo-aws-xray');
const mongojs = captureMongo(require('mongojs'));

const db = mongojs('mongodb://localhost:27017/your-db').

// This call will be instrumented and sent to XRay.
db.superCoolDB.findOne({
    foo: 'bar'
}, (err, doc) => {
    if (err) {
        console.error(err);
    } else {
        console.log(doc);
    }
});
```