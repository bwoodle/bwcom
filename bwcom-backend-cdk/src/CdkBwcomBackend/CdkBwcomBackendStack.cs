using Amazon.CDK;
using Amazon.CDK.AWS.Lambda;
using Amazon.CDK.AWS.APIGateway;
using Constructs;
using Amazon.CDK.AWS.Route53;
using Amazon.CDK.AWS.CertificateManager;
using Amazon.CDK.AWS.Route53.Targets;

namespace CdkBwcomBackend
{
    public class CdkBwcomBackendStack : Stack
    {
        internal CdkBwcomBackendStack(Construct scope, string id, StackProps props = null) : base(scope, id, props)
        {
            var rootDomain = "brentwoodle.com";
            var zone = HostedZone.FromLookup(this, "bwcom", new HostedZoneProviderProps(){ DomainName = rootDomain});

            // Define the Lambda function resource
            var helloWorldFunction = new Function(this, "BwcomData", new FunctionProps
            {
                Runtime = Runtime.NODEJS_20_X, // Choose any supported Node.js runtime
                Code = Code.FromAsset("lambda"), // Points to the lambda directory
                Handler = "hello.handler" // Points to the 'hello' file in the lambda directory
            });

            // Define the API Gateway resource
            var api = new LambdaRestApi(this, "bwcom-api", new LambdaRestApiProps
            {
                Deploy = false,
                DomainName = new DomainNameOptions()
                {
                    DomainName = "bwcom-api.brentwoodle.com",
                    Certificate = Certificate.FromCertificateArn(this, "bwcom-cert", "arn:aws:acm:us-east-1:685339315795:certificate/3ab367af-a156-481c-934b-47e65da78c4e")
                },
                Handler = helloWorldFunction,
                Proxy = false
            });

            var deployment = new Deployment(this, "bwcom-deployment", new DeploymentProps{
                Api = api
            });

            new Amazon.CDK.AWS.APIGateway.Stage(this, "bwcom-test-stage", new Amazon.CDK.AWS.APIGateway.StageProps
            {
                Deployment = deployment,
                StageName = "test",

            });

            new Amazon.CDK.AWS.APIGateway.Stage(this, "bwcom-prod-stage", new Amazon.CDK.AWS.APIGateway.StageProps
            {
                Deployment = deployment,
                StageName = "prod"
            });

            new ARecord(this, "bwcom-api-dns", new ARecordProps
            {
                Zone = zone,
                RecordName = "bwcom-api",
                Target = RecordTarget.FromAlias(new ApiGateway(api))
            });

            // Add a '/hello' resource with a GET method
            var helloResource = api.Root.AddResource("hello");
            helloResource.AddMethod("GET");
        }
    }
}
