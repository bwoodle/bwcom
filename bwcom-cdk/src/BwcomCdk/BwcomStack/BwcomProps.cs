using Amazon.CDK;

public class BwcomProps : StackProps
{
  public string Id { get; set; }
  public string CertificateArn { get; set; }
  // Website Properties
  public bool DeployWebsite { get; set; } = true;
  public string WebsiteDomain { get; set; }
  public string DistroParamName { get; set; }
  // Second Website for www. redirect
  public bool CreateRedirectWebsite { get; set; } = false;
  public string RedirectSourceDomain { get; set; }
  // Api Properties
  public string ApiSubdomain { get; set; }
  public string AllowedOrigin { get; set; }
}