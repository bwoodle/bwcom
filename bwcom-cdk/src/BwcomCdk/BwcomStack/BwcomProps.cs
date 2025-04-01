using Amazon.CDK;

public class BwcomProps : StackProps
{
  public required string EnvName { get; init; }
  public required string Id { get; init; }
  public required string CertificateArn { get; init; }
  // Website Properties
  public required bool DeployWebsite { get; init; } = true;
  public required string WebsiteDomain { get; init; }
  // Second Website for www. redirect
  public required bool CreateRedirectWebsite { get; init; } = false;
  public required string RedirectSourceDomain { get; init; }
  // Api Properties
  public required string ApiSubdomain { get; init; }
  public required string AllowedOrigin { get; init; }
}