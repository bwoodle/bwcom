using Amazon.CDK;

internal class StaticWebsiteProps
{
  public IEnvironment Env { get; set; }
  public string WebsiteUrl { get; set; }
  public string DistroParamName { get; set; }
  public string CertificateArn { get; set; }
}