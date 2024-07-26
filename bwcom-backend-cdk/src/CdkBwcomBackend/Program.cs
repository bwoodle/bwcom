using Amazon.CDK;
using CdkBwcomBackend.FunctionsStack;
using System;
using System.Collections.Generic;
using System.Linq;

namespace CdkBwcomBackend
{
  sealed class Program
  {
    public static void Main(string[] args)
    {
      var app = new App();

      var functions = new DataFunctionsStack(app, "BwcomDataFunctions", new StackProps
      {
        Env = new Amazon.CDK.Environment()
        {
          Account = "685339315795",
          Region = "us-east-1"
        }
      });

      new DataApiStack(app, "CdkBwcomBackendStack", new DataApiProps
      {
        Env = new Amazon.CDK.Environment()
        {
          Account = "685339315795",
          Region = "us-east-1"
        },
        DataApi = functions.HelloWorld,
        DataApiTestAlias = functions.HelloWorldTest,
        DataApiProdAlias = functions.HelloWorldProd
      });
      app.Synth();
    }
  }
}
