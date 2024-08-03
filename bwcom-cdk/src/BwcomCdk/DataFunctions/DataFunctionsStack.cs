
using System.Collections.Generic;
using Amazon.CDK;
using Amazon.CDK.AWS.Lambda;
using Constructs;

namespace BwcomCdk.FunctionsStack
{
  public class DataFunctionsStack : Stack
  {
    public readonly Alias CurrentVersion;

    internal DataFunctionsStack(Construct scope, string id, DataFunctionProps props) : base(scope, id, props)
    {
      var fn = new Function(this, "BwcomDataFn", new FunctionProps
      {
        Runtime = Runtime.NODEJS_20_X, // Choose any supported Node.js runtime
        Code = Code.FromAsset("lambda"), // Points to the lambda directory
        Handler = "hello.handler", // Points to the 'hello' file in the lambda directory
        Environment = new Dictionary<string, string>
        {
          ["origin"] = props.AllowedOrigin
        }
      });

      CurrentVersion = new Alias(this, "BwcomDataLatest", new AliasProps
      {
        AliasName = "latest",
        Description = "Latest data integration",
        Version = fn.CurrentVersion
      });
    }
  }
}