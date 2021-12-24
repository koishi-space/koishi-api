const winston = require("winston");

const express = require("express");
const app = express();

require("./startup/config")();
if (process.env.NODE_ENV === "production") require("./startup/prod")(app);
require("./startup/logging")();
require("./startup/db")();
require("./startup/routes")(app);


const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  winston.info(
    `[SERVER] Server startup! listening on port: ${port} in mode: ${process.env.NODE_ENV}`
  );
  console.log(
    `[SERVER] Server startup! listening on port: ${port} in mode: ${process.env.NODE_ENV}`
  );
});

module.exports = server;
