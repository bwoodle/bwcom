
using System.Collections.Generic;
using Amazon.CDK;
using Amazon.CDK.AWS.CloudFront;
using Amazon.CDK.AWS.IAM;
using Amazon.CDK.AWS.Route53;
using Amazon.CDK.AWS.Route53.Targets;
using Amazon.CDK.AWS.S3;
using Amazon.CDK.AWS.SSM;
using Constructs;

namespace BwcomCdk.Constructs
{
  public class StaticWebsite : Construct
  {
    internal StaticWebsite(Construct scope, string id, StaticWebsiteProps props) : base(scope, id)
    {
      var bucket = new Bucket(this, "ContentBucket", new BucketProps
      {
        AccessControl = BucketAccessControl.PRIVATE,
        BucketName = props.WebsiteUrl,
        RemovalPolicy = RemovalPolicy.DESTROY
      });

      var oac = new CfnOriginAccessControl(this, "OAC", new CfnOriginAccessControlProps
      {
        OriginAccessControlConfig = new CfnOriginAccessControl.OriginAccessControlConfigProperty
        {
          Name = props.WebsiteUrl,
          OriginAccessControlOriginType = "s3",
          SigningBehavior = "always",
          SigningProtocol = "sigv4",
          Description = "origin access control(OAC) for allowing cloudfront to access S3 bucket"
        }
      });

      var webDistro = new CfnDistribution(this, "Distro", new CfnDistributionProps
      {
        DistributionConfig = new CfnDistribution.DistributionConfigProperty
        {
          Origins = new[]
          {
            new CfnDistribution.OriginProperty
            {
              DomainName = bucket.BucketDomainName,
              Id = props.WebsiteUrl,
              S3OriginConfig = new CfnDistribution.S3OriginConfigProperty
              {
                OriginAccessIdentity = ""
              },
              OriginAccessControlId = oac.AttrId
            }
          },
          Enabled = true,
          Aliases = new[] { props.WebsiteUrl },
          DefaultRootObject = "index.html",
          CustomErrorResponses = new[]
          {
            new CfnDistribution.CustomErrorResponseProperty
            {
                ErrorCode = 404,
                ResponseCode = 200,
                ResponsePagePath = "/index.html"
            },
            new CfnDistribution.CustomErrorResponseProperty
            {
                ErrorCode = 403,
                ResponseCode = 200,
                ResponsePagePath = "/index.html"
            }
          },
          HttpVersion = "http2",
          ViewerCertificate = new CfnDistribution.ViewerCertificateProperty
          {
            AcmCertificateArn = props.CertificateArn,
            MinimumProtocolVersion = "TLSv1.2_2021",
            SslSupportMethod = "sni-only"
          },
          DefaultCacheBehavior = new CfnDistribution.DefaultCacheBehaviorProperty
          {
            TargetOriginId = props.WebsiteUrl,
            ViewerProtocolPolicy = "redirect-to-https",
            Compress = true,
            AllowedMethods = new[]
            {
              "DELETE",
              "GET",
              "HEAD",
              "OPTIONS",
              "PATCH",
              "PUT",
              "POST",
            },
            ForwardedValues = new CfnDistribution.ForwardedValuesProperty
            {
              QueryString = false,
              Cookies = new CfnDistribution.CookiesProperty
              {
                Forward = "none"
              }
            }
          },
        }
      });

      var policyStatement = new PolicyStatement(new PolicyStatementProps
      {

        Actions = new[] { "s3:GetObject" },
        Effect = Effect.ALLOW,
        Resources = new[] { $"{bucket.BucketArn}/*" },
        Principals = new[] { new ServicePrincipal("cloudfront.amazonaws.com") },
        Conditions = new Dictionary<string, object>
        {
          {
            "StringEquals",
            new Dictionary<string, object>
            {
              {
                "AWS:SourceArn",
                $"arn:aws:cloudfront::{props.Env.Account}:distribution/{webDistro.AttrId}"
              }
            }
          }
        }
      });

      bucket.AddToResourcePolicy(policyStatement);

      var zone = HostedZone.FromLookup(this, "Zone", new HostedZoneProviderProps
      {
        DomainName = "brentwoodle.com"
      });
      new CfnRecordSetGroup(this, "Record", new CfnRecordSetGroupProps
      {
        HostedZoneId = zone.HostedZoneId,
        RecordSets = new[]
        {
          new CfnRecordSetGroup.RecordSetProperty
          {
            Name = props.WebsiteUrl,
            Type = "A",
            AliasTarget = new CfnRecordSetGroup.AliasTargetProperty
            {
              DnsName = webDistro.AttrDomainName,
              HostedZoneId = "Z2FDTNDATAQYW2"
            }
          }
        },
      });

      new StringParameter(this, "DistroId", new StringParameterProps
      {
        Description = "CloudFront distribution ID",
        ParameterName = props.DistroParamName,
        StringValue = webDistro.AttrId
      });
    }
  }
}