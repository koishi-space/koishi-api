const winston = require("winston");
const express = require("express");

const app = express();
const http = require("http").Server(app);
const port = process.env.PORT || 3000;

require("./startup/config")();
if (process.env.NODE_ENV === "production") require("./startup/prod")(app);
require("./startup/logging")();
require("./startup/db")();
require("./startup/routes")(app);
require("./startup/socket")(http);

const server = http.listen(port, () => {
  winston.info(
    `[SERVER] Server startup! listening on port ${port} in mode ${process.env.NODE_ENV}`
  );
  console.log(
    `[SERVER] Server startup! listening on port ${port} in mode ${process.env.NODE_ENV}`
  );
});

module.exports = server;
