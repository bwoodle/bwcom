using Amazon.CDK;
using Amazon.CDK.AWS.CodeDeploy;
using Amazon.CDK.AWS.Lambda;
using Constructs;

namespace CdkBwcomBackend.FunctionsStack
{
  public class DataFunctionsStack : Stack
  {
    public readonly Alias HelloWorldTest;
    public readonly Alias HelloWorldProd;

    internal DataFunctionsStack(Construct scope, string id, StackProps props = null) : base(scope, id, props)
    {
      var fn = new Function(this, "BwcomData", new FunctionProps
      {
        Runtime = Runtime.NODEJS_20_X, // Choose any supported Node.js runtime
        Code = Code.FromAsset("lambda"), // Points to the lambda directory
        Handler = "hello.handler" // Points to the 'hello' file in the lambda directory
      });

      HelloWorldTest = new Alias(this, "BwcomTestData", new AliasProps
      {
        AliasName = "test",
        Description = "Test data integration",
        Version = fn.LatestVersion
      });

      HelloWorldProd = new Alias(this, "BwcomProdData", new AliasProps
      {
        AliasName = "prod",
        Description = "Prod data integration",
        Version = fn.CurrentVersion
      });
    }
  }
}
