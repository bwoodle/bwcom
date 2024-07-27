using Amazon.CDK;
using CdkBwcomBackend.FunctionsStack;

namespace CdkBwcomBackend
{
  sealed class Program
  {
    public static void Main(string[] args)
    {
      var app = new App();

      var functions = new DataFunctionsStack(app, "BwcomDataFunctions", new StackProps
      {
        Env = new Environment()
        {
          Account = "685339315795",
          Region = "us-east-1"
        }
      });

      new DataApiStack(app, "BwcomTestApi", new DataApiProps
      {
        Env = new Environment()
        {
          Account = "685339315795",
          Region = "us-east-1"
        },
        FunctionAlias = functions.HelloWorldTest,
        Origin = "https://test.brentwoodle.com",
        ApiSubdomain = "bwcom-test-api"
      });

      new DataApiStack(app, "BwcomProdApi", new DataApiProps
      {
        Env = new Environment()
        {
          Account = "685339315795",
          Region = "us-east-1"
        },
        FunctionAlias = functions.HelloWorldProd,
        Origin = "https://brentwoodle.com",
        ApiSubdomain = "bwcom-api"
      });

      app.Synth();
    }
  }
}
