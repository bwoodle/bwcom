using Amazon.CDK;
using Amazon.CDK.AWS.Lambda;

public class DataApiProps
{
  public Alias FunctionAlias { get; set; }
  public string AllowedOrigin { get; set; }
  public string ApiSubdomain { get; set; }
  public string CertificateArn { get; set; }
}
