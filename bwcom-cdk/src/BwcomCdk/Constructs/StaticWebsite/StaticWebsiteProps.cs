using Amazon.CDK;

internal class StaticWebsiteProps
{
  public IEnvironment Env { get; set; }
  public string Id { get; set; }
  public string CertificateArn { get; set; }
  public string WebsiteDomain { get; set; }
  public string DistroParamName { get; set; }
}