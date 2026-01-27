using Amazon.CDK;

internal class DataFunctionProps
{
  public required IEnvironment Env { get; init; }
  public required string[] AllowedOrigins { get; init; }
  public required string EnvName { get; init; }
}