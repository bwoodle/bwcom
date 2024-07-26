using Amazon.CDK;
using Amazon.CDK.AWS.Lambda;

public class DataApiProps : StackProps
{
  public Function DataApiFunction { get; set; }
}
