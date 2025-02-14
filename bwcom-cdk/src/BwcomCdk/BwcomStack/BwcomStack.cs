using Amazon.CDK;
using BwcomCdk.Constructs;
using BwcomCdk.Constructs.RedirectWebsite;
using Constructs;

internal class BwcomStack : Stack
{
  public BwcomStack(Construct scope, string id, BwcomProps props) : base(scope, id, props)
  {
    if (props.DeployWebsite)
    {
      new StaticWebsite(this, "Website", new StaticWebsiteProps
      {
        Env = props.Env,
        Id = props.Id,
        WebsiteDomain = props.WebsiteDomain,
        DistroParamName = props.DistroParamName,
        CertificateArn = props.CertificateArn
      });
    }

    if (props.CreateRedirectWebsite)
    {
      new RedirectWebsite(this, "RedirectWebsite", new RedirectWebsiteProps
      {
        Env = props.Env,
        CertificateArn = props.CertificateArn,
        RedirectSourceDomain = props.RedirectSourceDomain,
        RedirectTargetDomain = props.WebsiteDomain
      });
    }

    var testFns = new DataFunctions(this, "DataFunctions", new DataFunctionProps
    {
      AllowedOrigin = props.AllowedOrigin
    });

    new DataApi(this, "DataApi", new DataApiProps
    {
      FunctionAlias = testFns.CurrentVersion,
      AllowedOrigin = props.AllowedOrigin,
      ApiSubdomain = props.ApiSubdomain,
      CertificateArn = props.CertificateArn
    });
  }
}


