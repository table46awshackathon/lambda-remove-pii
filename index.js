"use strict";

const _ = require('lodash');
const aws = require('aws-sdk');
const s3 = new aws.S3({apiVersion: '2006-03-01', region: 'us-west-2'});

exports.handler = function(event, context, callback) {
  if ('Records' in event) {
    _.each(event.Records, (record) => {
      process(record);
    });
  } else {
    console.log('Invalid event');
    console.log(JSON.stringify(event));
  }
}

function process(record) {
  if (record.eventSource !== "aws:s3") {
    console.log(`Invalid event source: ${record.eventSource}`);
    return;
  }

  const bucket = record.s3.bucket.name;
  const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

  loadData(bucket, key)
    .then(convertData)
    .then((data) => saveData(bucket, key, data))
    .catch(error => {
      console.log(error);
    });
}

function loadData(bucket, key) {
  const params = {
      Bucket: bucket,
      Key: key,
  };
  return s3.getObject(params).promise();
}

function convertData(data) {
  return Promise.resolve("TEST\n" + data);
}

function saveData(bucket, key, data) {
  key = key.replace(/^pii\//, 'clean/');
  const params = {
      Bucket: bucket,
      Key: key,
      Body: data
  };
  return s3.putObject(params).promise();
}
