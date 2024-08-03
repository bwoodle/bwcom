using Amazon.CDK;
using Amazon.CDK.AWS.Lambda;

public class DataApiProps : StackProps
{
  public Alias FunctionAlias { get; set; }

  public string Origin { get; set; }

  public string ApiSubdomain { get; set; }
}
