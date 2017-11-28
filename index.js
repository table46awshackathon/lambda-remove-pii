"use strict";

const _ = require('lodash');
const aws = require('aws-sdk');
const s3 = new aws.S3({apiVersion: '2006-03-01', region: 'us-west-2'});
const athena = new aws.Athena({region: 'us-west-2'});

var csv = require('csv');

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
    .then(() => refreshAthena(key))
    .catch(error => {
      console.log(error);
    });
}

function loadData(bucket, key) {
  console.log(`Load csv from ${bucket} :: ${key}`);
  const params = {
      Bucket: bucket,
      Key: key,
  };
  return s3.getObject(params).promise();
}

function convertData(data) {
  var fieldsToRemove = ['First_Name', 'Last_Name'];
  console.log(`Removing fields from csv: ${fieldsToRemove}`);
  return new Promise((resolve, reject) => {
    csv.parse(data.Body.toString(), {columns: true}, function(err, data) {
      if (err) {
        return reject(err);
      }
      data = _.map(data, (row) => _.omit(row, fieldsToRemove));
      csv.stringify(data, {header: true}, function(err, data) {
        if (err) {
          return reject(err);
        }
        resolve(data);
      });
    });
  });
}

function saveData(bucket, key, data) {
  key = key.replace(/^pii\//, 'clean/');
  console.log(`Save csv to ${bucket} :: ${key}`);
  const params = {
      Bucket: bucket,
      Key: key,
      Body: data
  };
  return s3.putObject(params).promise();
}

function refreshAthena(key) {
  if (key !== 'pii/all.csv') {
    console.log(`Refresh athena data: ${key}`);
    return athena.getNamedQuery({NamedQueryId: 'a191d7e2-7cf1-4d2c-93a1-1f1d47fceedd'}).promise()
      .then(query => {
        console.log(query);
        var params = {
          QueryString: query.NamedQuery.QueryString,
          ResultConfiguration: {
            OutputLocation: 's3://table46hackathondata-athena/'
          },
          QueryExecutionContext: {
            Database: query.NamedQuery.Database
          }
        };
        return athena.startQueryExecution(params).promise();
      })
      .then(console.log);
  }
  return Promise.resolve();
}
