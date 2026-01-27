const { SSMClient, GetParameterCommand } = require("@aws-sdk/client-ssm"); // CommonJS import

exports.handler = async (event, _context) => {
  const client = new SSMClient();
  const input = { // GetParameterRequest
    Name: "/bwcom/" + process.env.env + "/version" // required
  };
  const command = new GetParameterCommand(input);
  const response = await client.send(command);
  console.log(response);

  // Handle CORS for multiple origins
  const allowedOrigins = process.env.origins ? process.env.origins.split(',').map(o => o.trim()) : [];
  const requestOrigin = event.headers?.origin || event.headers?.Origin;
  const corsOrigin = allowedOrigins.includes(requestOrigin) ? requestOrigin : undefined;

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      ...(corsOrigin && { "Access-Control-Allow-Origin": corsOrigin })
    },
    body: JSON.stringify({
      version: response.Parameter.Value,
      environment: process.env.env
    }),
  };
};