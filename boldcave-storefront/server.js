const { createServer } = require("node:http");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST || process.env.HOSTNAME || "127.0.0.1";
const port = Number(process.env.PORT || 3000);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((request, response) => {
    handle(request, response);
  }).listen(port, hostname, () => {
    console.log(
      `Bold Cave storefront ready on http://${hostname}:${port}`
    );
  });
});
