
using System.Collections.Generic;
using Amazon.CDK;
using Amazon.CDK.AWS.IAM;
using Amazon.CDK.AWS.Lambda;
using Constructs;

namespace BwcomCdk.Constructs
{
  public class DataFunctions : Construct
  {
    public readonly Alias CurrentVersion;

    internal DataFunctions(Construct scope, string id, DataFunctionProps props) : base(scope, id)
    {
      var fn = new Function(this, "Version", new FunctionProps
      {
        Runtime = Runtime.NODEJS_20_X,
        Code = Code.FromAsset("lambda"), // Points to the lambda directory
        Handler = "version.handler",
        Environment = new Dictionary<string, string>
        {
          ["origin"] = props.AllowedOrigin,
          ["env"] = props.EnvName
        }
      });

      fn.AddToRolePolicy(new PolicyStatement(new PolicyStatementProps
      {
        Effect = Effect.ALLOW,
        Actions = ["ssm:GetParameter"],
        Resources = [$"arn:aws:ssm:us-east-1:{props.Env.Account}:parameter/bwcom/{props.EnvName}/*"]
      }));

      CurrentVersion = new Alias(this, "LatestVersion", new AliasProps
      {
        AliasName = "latest",
        Description = "Latest data integration",
        Version = fn.CurrentVersion
      });
    }
  }
}
