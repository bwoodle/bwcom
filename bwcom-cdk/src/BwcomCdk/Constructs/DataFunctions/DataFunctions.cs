
using System.Collections.Generic;
using Amazon.CDK;
using Amazon.CDK.AWS.Lambda;
using Constructs;

namespace BwcomCdk.Constructs
{
  public class DataFunctions : Construct
  {
    public readonly Alias CurrentVersion;

    internal DataFunctions(Construct scope, string id, DataFunctionProps props) : base(scope, id)
    {
      var fn = new Function(this, "HelloWorld", new FunctionProps
      {
        Runtime = Runtime.NODEJS_20_X, // Choose any supported Node.js runtime
        Code = Code.FromAsset("lambda"), // Points to the lambda directory
        Handler = "hello.handler", // Points to the 'hello' file in the lambda directory
        Environment = new Dictionary<string, string>
        {
          ["origin"] = props.AllowedOrigin
        }
      });

      CurrentVersion = new Alias(this, "LatestVersion", new AliasProps
      {
        AliasName = "latest",
        Description = "Latest data integration",
        Version = fn.CurrentVersion
      });
    }
  }
}
