using Amazon.CDK;

public class BwcomProps : StackProps
{
  public string WebsiteUrl { get; set; }
  public string WebsiteOrigin { get; set; }
  public string ApiSubdomain { get; set; }
  public string DistroParamName { get; set; }
  public string CertificateArn { get; set; }
}