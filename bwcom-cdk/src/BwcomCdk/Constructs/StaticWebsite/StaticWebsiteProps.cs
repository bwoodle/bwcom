using Amazon.CDK;

internal class StaticWebsiteProps
{
  public required IEnvironment Env { get; init; }
  public required string EnvName { get; init; }
  public required string Id { get; init; }
  public required string CertificateArn { get; init; }
  public required string WebsiteDomain { get; init; }
}