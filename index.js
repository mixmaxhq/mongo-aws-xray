const _ = require('underscore');
const AWSXRay = require('aws-xray-sdk');

module.exports.captureMongo = function captureMongo(db) {
  // We've already wrapped it.
  if (db.__proto__.__collection) return db;

  patchCollection(db);
  return db;
};

function patchCollection(db) {
  // Because Mongojs adds that annoying proxy for all `get`s.
  db.__proto__.__collection = db.__proto__.collection;
  db.__proto__.collection = function patchedCollection() {
    const collection = db.__collection.apply(db, arguments);

    patchQueries(collection);

    return collection;
  };
}

const functions = [
  'find',
  'findOne',
  'update',
  'remove',
  'aggregate'
];

function patchQueries(coll) {
  functions.forEach(function(fn) {
    const baseName = `__${fn}`;
    coll[baseName] = coll[fn];
    coll[fn] = function() {
      var parent = AWSXRay.getSegment();

      if (!parent) {
        return coll[baseName].apply(this, arguments);
      }

      var subsegment = parent.addNewSubsegment(coll._name);
      subsegment.addMetadata('collection', coll._name);
      subsegment.addMetadata('query', fn);
      subsegment.addRemote();
      // TODO(ttacon): Add query fingerprint.

      let hasCb = false;
      var args = Array.from(arguments);
      if (args.length && _.isFunction(args[args.length-1])) {
        hasCb = true;
        const cb = args[args.length-1];
        args[args.length-1] = function(err, data) {
          subsegment.close(err);
          cb(err, data);
        };
      }

      var query = coll[baseName].apply(this, args);
      if (!hasCb) {
        var oldNext = coll[baseName].next;
        coll[baseName].next = function next(fn) {
          subsegment.close();
          oldNext.apply(coll[baseName], fn);
        };
      }

      return query;
    };
  });
}