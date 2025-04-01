using Amazon.CDK;

internal class DataFunctionProps
{
  public required IEnvironment Env { get; init; }
  public required string AllowedOrigin { get; init; }
  public required string EnvName { get; init; }
}