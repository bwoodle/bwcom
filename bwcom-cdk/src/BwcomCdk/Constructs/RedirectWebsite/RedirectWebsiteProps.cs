using Amazon.CDK;

namespace BwcomCdk.Constructs.RedirectWebsite;

internal class RedirectWebsiteProps
{
    public IEnvironment Env { get; set; }
    public string CertificateArn { get; set; }
    public string RedirectSourceDomain { get; set; }
    public string RedirectTargetDomain { get; set; }
}