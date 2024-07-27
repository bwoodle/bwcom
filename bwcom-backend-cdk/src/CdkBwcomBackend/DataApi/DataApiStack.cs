using Amazon.CDK;
using Amazon.CDK.AWS.APIGateway;
using Constructs;
using Amazon.CDK.AWS.Route53;
using Amazon.CDK.AWS.CertificateManager;
using Amazon.CDK.AWS.Route53.Targets;

namespace CdkBwcomBackend
{
  public class DataApiStack : Stack
  {
    internal DataApiStack(Construct scope, string id, DataApiProps props) : base(scope, id, props)
    {
      var zone = HostedZone.FromLookup(this, "BwcomZone", new HostedZoneProviderProps() { DomainName = "brentwoodle.com" });
      var cert = Certificate.FromCertificateArn(this, $"BwcomCert", "arn:aws:acm:us-east-1:685339315795:certificate/3ab367af-a156-481c-934b-47e65da78c4e");

      var api = new LambdaRestApi(this, "BwcomApi", new LambdaRestApiProps
      {
        Handler = props.FunctionAlias,
        DomainName = new DomainNameProps
        {
          DomainName = $"{props.ApiSubdomain}.brentwoodle.com",
          Certificate = cert
        },
        Proxy = false,
        DefaultCorsPreflightOptions = new CorsOptions
        {
          AllowOrigins = new string[] { props.Origin }
        }
      });

      CreateApiResources(api);

      new ARecord(this, $"BwcomApiDns", new ARecordProps
      {
        Zone = zone,
        RecordName = props.ApiSubdomain,
        Target = RecordTarget.FromAlias(new ApiGateway(api))
      });
    }

    private void CreateApiResources(IRestApi api)
    {
      var helloResource = api.Root.AddResource("hello");
      helloResource.AddMethod("GET");
    }
  }
}
