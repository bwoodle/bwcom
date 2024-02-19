# Brent Woodle's Playground
## Setup from scratch
```
1. `aws configure` and set access keys for `CliUser` IAM User (User must be created, of course)
2. Follow Website Infrastructure deployment instructions
3. Follow Angular application deployment instructions
```

## Website Infrastructure

### Development
1. Edit Cloudformation stacks in `cfn/website`. `bwcom.yml` is the Root development stack

### Deployment

```
cd cfn\website
aws cloudformation package --template-file bwcom.yml --output-template packaged.yml --s3-bucket cfn-brentwoodle.com
aws cloudformation deploy --template-file packaged.yml --stack-name bwcom --role-arn arn:aws:iam::685339315795:role/CfnDeploymentRole
```

## Angular application

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

## API application

### Development
1. Visual Studio 2022 Community edition
2. Open sln `bwcom-api.sln`
3. Run in Docker

### Deployment
```
aws ecr get-login-password | docker login --username AWS --password-stdin 685339315795.dkr.ecr.us-east-1.amazonaws.com
docker tag bwcom-api 685339315795.dkr.ecr.us-east-1.amazonaws.com/bwcom
docker push 685339315795.dkr.ecr.us-east-1.amazonaws.com/bwcom
```