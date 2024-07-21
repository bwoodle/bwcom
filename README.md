# Brent Woodle's Playground
## Setup from scratch
```
1. `aws configure` and set access keys for `CliUser` IAM User (User must be created, of course)
2. Follow BWCom Network Infrastructure deployment instructions
3. Follow BWCom Static Website Infrastructure deployment instructions
4. Follow BWCom Static Website Application deployment instructions
5. Follow BWCom Backend deployment instructions
```

## BWCom Network Infrastructure

### Development
1. Edit Cloudformation stacks in `cfn/bwcom-network`. `bwcom-network.yml` is the Root development stack

### Deployment
```
cd cfn\bwcom-network
aws cloudformation package --template-file bwcom-network.yml --output-template packaged.yml --s3-bucket cfn-brentwoodle.com
aws cloudformation deploy --template-file packaged.yml --stack-name bwcom-network --role-arn arn:aws:iam::685339315795:role/CfnDeploymentRole
```

## BWCom Static Website Infrastructure

### Development
1. Edit Cloudformation stacks in `cfn/bwcom-static`. `bwcom-static.yml` is the Root development stack

### Deployment
```
cd cfn\bwcom-static
aws cloudformation package --template-file bwcom-static.yml --output-template packaged.yml --s3-bucket cfn-brentwoodle.com
aws cloudformation deploy --template-file packaged.yml --stack-name bwcom --role-arn arn:aws:iam::685339315795:role/CfnDeploymentRole
```

## BWCom Static Website Application

### Development
1. Visual Studio Code
2. Open folder `bwcom-static`
3. Restore workspace recommended packages
```
cd bwcom-static

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

## BWCom Backend Application

### Development
1. Visual Studio 2022 Community edition
2. Open sln `bwcom-backend\cdk-bwcom-backend\src\CdkBwcomBackend.sln`

### Deployment
1. cd `bwcom-backend\cdk-bwcom-backend`
2. `dotnet build sln`
3. `cdk synth`
4. `cdk deploy`

### Teardown
1. cd `bwcom-backend\cdk-bwcom-backend`
2. `cdk destroy`
