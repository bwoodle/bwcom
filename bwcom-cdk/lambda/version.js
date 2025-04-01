const { SSMClient, GetParameterCommand } = require("@aws-sdk/client-ssm"); // CommonJS import

exports.handler = async (_event, _context) => {
  const client = new SSMClient();
  const input = { // GetParameterRequest
    Name: "/bwcom/" + process.env.env + "/version" // required
  };
  const command = new GetParameterCommand(input);
  const response = await client.send(command);
  console.log(response);

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": process.env.origin
    },
    body: JSON.stringify({
      version: response.Parameter.Value,
      environment: process.env.env
    }),
  };
};