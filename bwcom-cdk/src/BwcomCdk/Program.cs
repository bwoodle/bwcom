using Amazon.CDK;
using BwcomCdk.FunctionsStack;

namespace BwcomCdk
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

      // Test Environment - will soon encapsulate in a L3 construct
      var testOrigin = "https://test.brentwoodle.com";
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

      new StaticWebsiteStack(app, "BwcomTestWebsite", new StaticWebsiteStackProps
      {
        Env = bwcomEnv,
        BucketName = "test2.brentwoodle.com",
        WebsiteUrl = "test2.brentwoodle.com",
        CertificateArn = "arn:aws:acm:us-east-1:685339315795:certificate/3ab367af-a156-481c-934b-47e65da78c4e"
      });

      // Prod Environment - will soon encapsulate in a L3 construct
      var prodOrigin = "https://brentwoodle.com";
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
