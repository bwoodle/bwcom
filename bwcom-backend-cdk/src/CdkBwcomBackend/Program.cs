using Amazon.CDK;
using CdkBwcomBackend.FunctionsStack;

namespace CdkBwcomBackend
{
  sealed class Program
  {
    public static void Main(string[] args)
    {
      var app = new App();

      // Test Environment
      var testFns = new DataFunctionsStack(app, "BwcomTestFunctions", new StackProps
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
        FunctionAlias = testFns.CurrentVersion,
        Origin = "https://test.brentwoodle.com",
        ApiSubdomain = "bwcom-test-api"
      });

      // Prod Environment
      var prodFns = new DataFunctionsStack(app, "BwcomProdFunctions", new StackProps
      {
        Env = new Environment()
        {
          Account = "685339315795",
          Region = "us-east-1"
        }
      });

      new DataApiStack(app, "BwcomProdApi", new DataApiProps
      {
        Env = new Environment()
        {
          Account = "685339315795",
          Region = "us-east-1"
        },
        FunctionAlias = prodFns.CurrentVersion,
        Origin = "https://brentwoodle.com",
        ApiSubdomain = "bwcom-api"
      });

      app.Synth();
    }
  }
}
