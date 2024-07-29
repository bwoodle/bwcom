exports.handler = async (event) => {
  let allowedOrigin = "https://brentwoodle.com";
  if (event.headers.origin == "https://test.brentwoodle.com") {
    allowedOrigin = event.headers.origin;
  }
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": allowedOrigin
    },
    body: JSON.stringify({ message: "Hello, World14" }),
  };
};