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
        EnvName = props.EnvName,
        Id = props.Id,
        WebsiteDomain = props.WebsiteDomain,
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
      Env = props.Env,
      AllowedOrigin = props.AllowedOrigin,
      EnvName = props.EnvName,
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


