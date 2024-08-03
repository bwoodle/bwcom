using Amazon.CDK;

internal class StaticWebsiteStackProps : StackProps
{
  public string BucketName { get; set; }

  public string WebsiteUrl { get; set; }

  public string CertificateArn { get; set; }
}