using Amazon.CDK;
using CdkBwcomBackend.FunctionsStack;

namespace CdkBwcomBackend
{
  sealed class Program
  {
    public static void Main(string[] args)
    {
      var app = new App();
      var bwcomEnv = new Environment()
        {
          Account = "685339315795",
          Region = "us-east-1"
        };
      var testOrigin = "https://test.brentwoodle.com";
      var prodOrigin = "https://brentwoodle.com";

      // Test Environment
      var testFns = new DataFunctionsStack(app, "BwcomTestFunctions", new DataFunctionProps
      {
        Env = bwcomEnv,
        AllowedOrigin = testOrigin
      });

      new DataApiStack(app, "BwcomTestApi", new DataApiProps
      {
        Env = bwcomEnv,
        FunctionAlias = testFns.CurrentVersion,
        Origin = testOrigin,
        ApiSubdomain = "bwcom-test-api"
      });

      // Prod Environment
      var prodFns = new DataFunctionsStack(app, "BwcomProdFunctions", new DataFunctionProps
      {
        Env = bwcomEnv,
        AllowedOrigin = prodOrigin
      });

      new DataApiStack(app, "BwcomProdApi", new DataApiProps
      {
        Env = bwcomEnv,
        FunctionAlias = prodFns.CurrentVersion,
        Origin = prodOrigin,
        ApiSubdomain = "bwcom-api"
      });

      app.Synth();
    }
  }
}
