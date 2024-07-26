using Amazon.CDK;
using Amazon.CDK.AWS.Lambda;

public class DataApiProps : StackProps
{
  public Function DataApi { get; set; }
  public Alias DataApiTestAlias { get; set; }
  public Alias DataApiProdAlias { get; set; }
}
