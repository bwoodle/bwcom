using Amazon.CDK;
using BwcomCdk.Constructs;
using Constructs;

internal class BwcomStack : Stack
{
  public BwcomStack(Construct scope, string id, BwcomProps props) : base(scope, id, props)
  {
    new StaticWebsite(this, "Website", new StaticWebsiteProps
    {
      Env = props.Env,
      WebsiteUrl = props.WebsiteUrl,
      CertificateArn = props.CertificateArn
    });

    var testFns = new DataFunctions(this, "DataFunctions", new DataFunctionProps
    {
      AllowedOrigin = props.WebsiteOrigin
    });

    new DataApi(this, "DataApi", new DataApiProps
    {
      FunctionAlias = testFns.CurrentVersion,
      Origin = props.WebsiteOrigin,
      ApiSubdomain = props.ApiSubdomain
    });
  }
}


