exports.handler = async (_event, _context) => {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": process.env.origin
    },
    body: JSON.stringify({ message: "Hello, World19" }),
  };
};