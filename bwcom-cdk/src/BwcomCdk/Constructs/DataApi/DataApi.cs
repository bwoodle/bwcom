using Amazon.CDK;
using Amazon.CDK.AWS.APIGateway;
using Constructs;
using Amazon.CDK.AWS.Route53;
using Amazon.CDK.AWS.CertificateManager;
using Amazon.CDK.AWS.Route53.Targets;

namespace BwcomCdk.Constructs
{
  public class DataApi : Construct
  {
    internal DataApi(Construct scope, string id, DataApiProps props) : base(scope, id)
    {
      var zone = HostedZone.FromLookup(this, "Zone", new HostedZoneProviderProps() { DomainName = "brentwoodle.com" });
      var cert = Certificate.FromCertificateArn(this, "BwcomCert", props.CertificateArn);

      var api = new LambdaRestApi(this, "DataApi", new LambdaRestApiProps
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
          AllowOrigins = new string[] { props.AllowedOrigin }
        }
      });

      CreateApiResources(api);

      new ARecord(this, "ApiDns", new ARecordProps
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
