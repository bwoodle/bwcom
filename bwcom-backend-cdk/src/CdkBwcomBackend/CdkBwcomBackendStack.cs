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
      var helloWorldFunction = new Function(this, "BwcomData", new FunctionProps
      {
        Runtime = Runtime.NODEJS_20_X, // Choose any supported Node.js runtime
        Code = Code.FromAsset("lambda"), // Points to the lambda directory
        Handler = "hello.handler" // Points to the 'hello' file in the lambda directory
      });

      var api = new LambdaRestApi(this, "bwcom-api", new LambdaRestApiProps
      {
        Deploy = false,
        Handler = helloWorldFunction,
        Proxy = false,
        DefaultCorsPreflightOptions = new CorsOptions
        {
          AllowOrigins = new string[] { "https://test.brentwoodle.com", "https://brentwoodle.com" }
        }
      });
      CreateApiResources(api);

      var deployment = new Deployment(this, "bwcom-deployment", new DeploymentProps
      {
        Api = api
      });

      var zone = HostedZone.FromLookup(this, "bwcom", new HostedZoneProviderProps() { DomainName = "brentwoodle.com" });
      var cert = Certificate.FromCertificateArn(this, $"bwcom-cert", "arn:aws:acm:us-east-1:685339315795:certificate/3ab367af-a156-481c-934b-47e65da78c4e");
      CreateStage(api, deployment, zone, cert, "prod", "bwcom-api");
      CreateStage(api, deployment, zone, cert, "test", "bwcom-test-api");
    }

    private void CreateApiResources(IRestApi api)
    {
      var helloResource = api.Root.AddResource("hello");
      helloResource.AddMethod("GET");
    }

    private void CreateStage(IRestApi api, Deployment deployment, IHostedZone zone, ICertificate certificate, string stageName, string dns)
    {
      var prodStage = new Amazon.CDK.AWS.APIGateway.Stage(this, $"bwcom-{stageName}-stage", new Amazon.CDK.AWS.APIGateway.StageProps
      {
        Deployment = deployment,
        StageName = stageName
      });

      var prodDomain = new DomainName_(this, $"bwcom-{stageName}-domain", new DomainNameProps
      {
        DomainName = $"{dns}.brentwoodle.com",
        Certificate = certificate
      });

      new BasePathMapping(this, $"bwcom-api-{stageName}-mapping", new BasePathMappingProps
      {
        DomainName = prodDomain,
        Stage = prodStage,
        RestApi = api
      });

      var domain = new ApiGatewayDomain(prodDomain);

      new ARecord(this, $"bwcom-{stageName}-dns", new ARecordProps
      {
        Zone = zone,
        RecordName = dns,
        Target = RecordTarget.FromAlias(domain)
      });
    }
  }
}
