using Amazon.CDK;

public class BwcomProps : StackProps
{
  public string Id { get; set; }
  public string CertificateArn { get; set; }
  // Website Properties
  public bool DeployWebsite { get; set; } = true;
  public string WebsiteDomain { get; set; }
  public string DistroParamName { get; set; }
  // Api Properties
  public string ApiSubdomain { get; set; }
  public string AllowedOrigin { get; set; }
}