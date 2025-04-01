using Amazon.CDK;

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

      // Some of these resources won't be used, but I can use them to develop locally
      new BwcomStack(app, "LocalDevBackend", new BwcomProps
      {
        Env = bwcomEnv,
        EnvName = "test",
        Id = "dev.brentwoodle.com",
        CertificateArn = "arn:aws:acm:us-east-1:685339315795:certificate/3ab367af-a156-481c-934b-47e65da78c4e",
        // Website Properties
        DeployWebsite = false,
        WebsiteDomain = "",
        CreateRedirectWebsite = false,
        RedirectSourceDomain = "",
        // Api Properties
        ApiSubdomain = "bwcom-dev-api",
        AllowedOrigin = "http://localhost:4200",
      });

      new BwcomStack(app, "TestDeployment", new BwcomProps
      {
        Env = bwcomEnv,
        EnvName = "test",
        Id = "test.brentwoodle.com",
        CertificateArn = "arn:aws:acm:us-east-1:685339315795:certificate/3ab367af-a156-481c-934b-47e65da78c4e",
        // Website Properties
        DeployWebsite = true,
        WebsiteDomain = "test.brentwoodle.com",
        CreateRedirectWebsite = false,
        RedirectSourceDomain = "",
        // Api Properties
        ApiSubdomain = "bwcom-test-api",
        AllowedOrigin = "https://test.brentwoodle.com"
      });

      new BwcomStack(app, "ProdDeployment", new BwcomProps
      {
        Env = bwcomEnv,
        EnvName = "prod",
        Id = "brentwoodle.com",
        CertificateArn = "arn:aws:acm:us-east-1:685339315795:certificate/3ab367af-a156-481c-934b-47e65da78c4e",
        // Website Properties
        DeployWebsite = true,
        WebsiteDomain = "brentwoodle.com",
        // Redirect Website Properties
        CreateRedirectWebsite = true,
        RedirectSourceDomain = "www.brentwoodle.com",
        // Api Properties
        ApiSubdomain = "bwcom-api",
        AllowedOrigin = "https://brentwoodle.com"
      });

      app.Synth();
    }
  }
}
