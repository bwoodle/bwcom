
using System.Collections.Generic;
using Amazon.CDK;
using Amazon.CDK.AWS.CloudFront;
using Amazon.CDK.AWS.IAM;
using Amazon.CDK.AWS.Route53;
using Amazon.CDK.AWS.Route53.Targets;
using Amazon.CDK.AWS.S3;
using Constructs;

namespace CdkBwcomBackend.FunctionsStack
{
  public class StaticWebsiteStack : Stack
  {
    internal StaticWebsiteStack(Construct scope, string id, StaticWebsiteStackProps props) : base(scope, id, props)
    {
      var bucket = new Bucket(this, "StaticWebsite", new BucketProps
      {
        AccessControl = BucketAccessControl.PRIVATE,
        BucketName = props.BucketName
      });

      var webDistro = new CloudFrontWebDistribution(this, "CloudFrontDistro", new CloudFrontWebDistributionProps
      {
        OriginConfigs = new[] { new SourceConfiguration {
        S3OriginSource = new S3OriginConfig {
            S3BucketSource = bucket
        },
        Behaviors = new [] { new Behavior { IsDefaultBehavior = true } }
    } }
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
                "AWS:SourceArn", $"arn:aws:cloudfront::{props.Env.Account}:distribution/{webDistro.DistributionId}"
              }
            }
          }
        }
      });

      bucket.AddToResourcePolicy(policyStatement);

      // new CfnOriginAccessControl(this, "OAC", new CfnOriginAccessControlProps
      // {
      //   OriginAccessControlConfig = new Dictionary<string, string>
      //   {
      //     ["Name"] = props.WebsiteUrl,
      //     ["Description"] = "origin access control(OAC) for allowing cloudfront to access S3 bucket",
      //     ["OriginAccessControlOriginType"] = "s3",
      //     ["SigningBehavior"] = "always",
      //     ["SigningProtocol"] = "sigv4"
      //   }
      // });



      // var zone = HostedZone.FromLookup(this, "BwcomZone", new HostedZoneProviderProps() { DomainName = "brentwoodle.com" });
      // new ARecord(this, $"BwcomApiDns", new ARecordProps
      // {
      //   Zone = zone,
      //   RecordName = props.WebsiteUrl,
      //   Target = RecordTarget.FromAlias(new CloudFrontTarget(webDistro))
      // });
    }
  }

}


/*
  CloudFrontDistribution:
    Type: AWS::CloudFront::Distribution
    DependsOn:
      - Bucket
    Properties:
      DistributionConfig:
        Origins:
        - Id: !Ref URL
          DomainName: !GetAtt Bucket.DomainName
          S3OriginConfig:
            OriginAccessIdentity: ''
          OriginAccessControlId: !GetAtt CloudFrontOriginAccessControl.Id
        Enabled: "true"
        Aliases:
          - !Ref URL
        DefaultRootObject: index.html
        CustomErrorResponses:
          - ErrorCode: 404
            ResponseCode: 200
            ResponsePagePath: /index.html
          - ErrorCode: 403
            ResponseCode: 200
            ResponsePagePath: /index.html
        HttpVersion: http2
        ViewerCertificate:
          AcmCertificateArn: !Ref CertificateARN
          MinimumProtocolVersion: TLSv1.2_2021
          SslSupportMethod: sni-only
        DefaultCacheBehavior:
          AllowedMethods:
            - DELETE
            - GET
            - HEAD
            - OPTIONS
            - PATCH
            - POST
            - PUT
          Compress: true
          TargetOriginId: !Ref URL
          ForwardedValues:
            QueryString: 'false'
            Cookies:
              Forward: none
          ViewerProtocolPolicy: redirect-to-https


  Bucket:
    Type: AWS::S3::Bucket
    Properties:
      AccessControl: Private
      BucketName: !Ref BucketName
  BucketPolicy:
    Type: AWS::S3::BucketPolicy
    Properties:
      Bucket: !Ref Bucket
      PolicyDocument:
        Statement:
        - Action: s3:GetObject
          Effect: Allow
          Resource: !Sub ${Bucket.Arn}/*
          Principal:
            Service: cloudfront.amazonaws.com
          Condition:
            StringEquals:
              AWS:SourceArn: !Sub arn:aws:cloudfront::${AWS::AccountId}:distribution/${CloudFrontDistribution}
  CloudFrontOriginAccessControl:
    Type: AWS::CloudFront::OriginAccessControl
    Properties:
      OriginAccessControlConfig:
        Description: "origin access control(OAC) for allowing cloudfront to access S3 bucket"
        Name: !Ref URL
        OriginAccessControlOriginType: s3
        SigningBehavior: always
        SigningProtocol: sigv4
  CloudFrontDistribution:
    Type: AWS::CloudFront::Distribution
    DependsOn:
      - Bucket
    Properties:
      DistributionConfig:
        Origins:
        - Id: !Ref URL
          DomainName: !GetAtt Bucket.DomainName
          S3OriginConfig:
            OriginAccessIdentity: ''
          OriginAccessControlId: !GetAtt CloudFrontOriginAccessControl.Id
        Enabled: "true"
        Aliases:
          - !Ref URL
        DefaultRootObject: index.html
        CustomErrorResponses:
          - ErrorCode: 404
            ResponseCode: 200
            ResponsePagePath: /index.html
          - ErrorCode: 403
            ResponseCode: 200
            ResponsePagePath: /index.html
        HttpVersion: http2
        ViewerCertificate:
          AcmCertificateArn: !Ref CertificateARN
          MinimumProtocolVersion: TLSv1.2_2021
          SslSupportMethod: sni-only
        DefaultCacheBehavior:
          AllowedMethods:
            - DELETE
            - GET
            - HEAD
            - OPTIONS
            - PATCH
            - POST
            - PUT
          Compress: true
          TargetOriginId: !Ref URL
          ForwardedValues:
            QueryString: 'false'
            Cookies:
              Forward: none
          ViewerProtocolPolicy: redirect-to-https
  DNS: 
    Type: AWS::Route53::RecordSetGroup
    Properties:
      HostedZoneId: Z09563031TSQJ6OIZDHEE
      RecordSets:
        - Name: !Ref URL
          Type: A
          AliasTarget:
            HostedZoneId: Z2FDTNDATAQYW2
            DNSName: !GetAtt CloudFrontDistribution.DomainName
*/