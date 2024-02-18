# Components

## Angular application

### Development
```
cd bwcom

# Execute unit tests (watches for changes)
npm run test

# Test static build
npm run build

# Local development
npm run serve
```

### Deployment
1. Commit to `main` branch
2. `publish-test-bucket` pipeline will *automatically* trigger and and deploy to `test.brentwoodle.com`
3. `deploy-prod` pipeline must be *manually* triggered to deploy to `brentwoodle.com`

## Website

### Development
1. Edit Cloudformation stacks in `cfn/website`. `bwcom.yml` is the Root development stack

### Deployment
1. `aws configure` and set access keys for `CfnUser` IAM User
```
cd cfn\website
aws cloudformation package --template-file bwcom.yml --output-template packaged.yml --s3-bucket cfn-brentwoodle.com --role-arn arn:aws:iam::685339315795:role/CfnDeploymentRole
aws cloudformation deploy --template-file packaged.yml --stack-name bwcom --role-arn arn:aws:iam::685339315795:role/CfnDeploymentRole
```
1. 