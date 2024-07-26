using Amazon.CDK;
using Amazon.CDK.AWS.Lambda;
using Constructs;

namespace CdkBwcomBackend.FunctionsStack
{
  public class DataFunctionsStack : Stack
  {
    public readonly Function HelloWorldFunction;
    internal DataFunctionsStack(Construct scope, string id, StackProps props = null) : base(scope, id, props)
    {
      HelloWorldFunction = new Function(this, "BwcomData", new FunctionProps
      {
        Runtime = Runtime.NODEJS_20_X, // Choose any supported Node.js runtime
        Code = Code.FromAsset("lambda"), // Points to the lambda directory
        Handler = "hello.handler" // Points to the 'hello' file in the lambda directory
      });
    }
  }
}
