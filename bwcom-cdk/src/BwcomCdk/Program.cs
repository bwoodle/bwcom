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
        Id = "dev.brentwoodle.com",
        CertificateArn = "arn:aws:acm:us-east-1:685339315795:certificate/3ab367af-a156-481c-934b-47e65da78c4e",
        // Website Properties
        DeployWebsite = false,
        WebsiteDomain = "",
        DistroParamName = "",
        // Api Properties
        ApiSubdomain = "bwcom-dev-api",
        AllowedOrigin = "http://localhost:4200",
      });

      new BwcomStack(app, "TestDeployment", new BwcomProps
      {
        Env = bwcomEnv,
        Id = "test.brentwoodle.com",
        CertificateArn = "arn:aws:acm:us-east-1:685339315795:certificate/3ab367af-a156-481c-934b-47e65da78c4e",
        // Website Properties
        WebsiteDomain = "test.brentwoodle.com",
        DistroParamName = "/bwcom/test/distribution-id",
        // Api Properties
        ApiSubdomain = "bwcom-test-api",
        AllowedOrigin = "https://test.brentwoodle.com"
      });

      new BwcomStack(app, "ProdDeployment", new BwcomProps
      {
        Env = bwcomEnv,
        Id = "brentwoodle.com",
        CertificateArn = "arn:aws:acm:us-east-1:685339315795:certificate/3ab367af-a156-481c-934b-47e65da78c4e",
        // Website Properties
        WebsiteDomain = "brentwoodle.com",
        DistroParamName = "/bwcom/prod/distribution-id",
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
