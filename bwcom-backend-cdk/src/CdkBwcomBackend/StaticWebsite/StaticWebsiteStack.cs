
using Amazon.CDK;
using Amazon.CDK.AWS.Lambda;
using Constructs;

namespace CdkBwcomBackend.FunctionsStack
{
  public class StaticWebsiteStack : Stack
  {
    internal StaticWebsiteStack(Construct scope, string id, StaticWebsiteStackProps props) : base(scope, id, props)
    {

    }
  }

}