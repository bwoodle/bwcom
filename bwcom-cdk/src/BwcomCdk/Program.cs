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

      new BwcomStack(app, "TestDeployment", new BwcomProps
      {
        Env = bwcomEnv,
        WebsiteUrl = "test.brentwoodle.com",
        WebsiteOrigin = "https://test.brentwoodle.com",
        ApiSubdomain = "bwcom-test-api",
        CertificateArn = "arn:aws:acm:us-east-1:685339315795:certificate/3ab367af-a156-481c-934b-47e65da78c4e"
      });

      new BwcomStack(app, "ProdDeployment", new BwcomProps
      {
        Env = bwcomEnv,
        WebsiteUrl = "brentwoodle.com",
        WebsiteOrigin = "https://brentwoodle.com",
        ApiSubdomain = "bwcom-api",
        CertificateArn = "arn:aws:acm:us-east-1:685339315795:certificate/3ab367af-a156-481c-934b-47e65da78c4e"
      });

      app.Synth();
    }
  }
}
