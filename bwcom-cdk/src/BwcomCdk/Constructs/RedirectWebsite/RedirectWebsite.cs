using Amazon.CDK;
using Amazon.CDK.AWS.CloudFront;
using Amazon.CDK.AWS.Route53;
using Amazon.CDK.AWS.S3;
using Constructs;

namespace BwcomCdk.Constructs.RedirectWebsite;

public class RedirectWebsite : Construct
{
    internal RedirectWebsite(Construct scope, string id, RedirectWebsiteProps props) : base(scope, id)
    {
        var bucket = new Bucket(this, "ContentBucket", new BucketProps
        {
            AccessControl = BucketAccessControl.PRIVATE,
            BucketName = props.RedirectSourceDomain,
            RemovalPolicy = RemovalPolicy.DESTROY,
            WebsiteRedirect = new RedirectTarget
            {
                HostName = props.RedirectTargetDomain,
                Protocol = RedirectProtocol.HTTPS
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
                        DomainName = bucket.BucketWebsiteDomainName,
                        Id = props.RedirectSourceDomain,
                        CustomOriginConfig = new CfnDistribution.CustomOriginConfigProperty
                        {
                            HttpPort = 80,
                            HttpsPort = 443,
                            OriginProtocolPolicy = "http-only",
                            OriginSslProtocols = new[] { "TLSv1.2" }
                        }
                    }
                },
                Enabled = true,
                Aliases = new[] { props.RedirectSourceDomain },
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
                    TargetOriginId = props.RedirectSourceDomain,
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
                        "POST"
                    },
                    ForwardedValues = new CfnDistribution.ForwardedValuesProperty
                    {
                        QueryString = false,
                        Cookies = new CfnDistribution.CookiesProperty
                        {
                            Forward = "none"
                        }
                    }
                }
            }
        });

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
                    Name = props.RedirectSourceDomain,
                    Type = "A",
                    AliasTarget = new CfnRecordSetGroup.AliasTargetProperty
                    {
                        DnsName = webDistro.AttrDomainName,
                        HostedZoneId = "Z2FDTNDATAQYW2"
                    }
                }
            }
        });
    }
}