# Lambda function that removes all Personal Identifiable Information (PII)

- The Lambda function reacts to S3 put events, removes PII and stores
it to a different location.

## Instalation

```
npm install claudia -g
npm install -g aws-sam-local
```

## Test locally using AWS SAM

```
npm test
```

# Deploy lambda on AWS using ClaudiaJS

```
npm run create
```

## Test on AWS using ClaudiaJS

```
npm run test-lambda
```
