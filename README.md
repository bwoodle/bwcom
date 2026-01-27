# Brent Woodle's Playground
## Setup from scratch
```
1. `aws configure` and set access keys for `CliUser` IAM User (User must be created, of course)
2. Follow BWCom full deployment from CDK
3. If necessary, trigger publish-test-bucket and publish-lambda pipelines from Github actions to populate Test site
4. If necessary, trigger deploy-prod pipeline from github actions to populate Prod site
```

## BWCom Static Angular Website

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
npm run start
```

## BWCom full deployment

### Deployment
1. cd `bwcom-cdk`
2. `dotnet build src`
3. `cdk synth`
4. `cdk deploy --all`

### Teardown
1. cd `bwcom-cdk`
2. `cdk destroy --all`
