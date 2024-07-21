using Amazon.CDK;
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
            new CdkBwcomBackendStack(app, "CdkBwcomBackendStack", new StackProps
            {
                Env = new Amazon.CDK.Environment()
                {
                    Account = "685339315795",
                    Region = "us-east-1"
                }
            });
            app.Synth();
        }
    }
}
