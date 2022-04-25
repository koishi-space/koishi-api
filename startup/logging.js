require("express-async-errors");
const winston = require("winston");
const { format } = require("winston");
const { combine, printf } = format;
require("winston-mongodb");
const config = require("config");

/**
 * Manage server logs and their connectors
 */

/**
 * Setup server logging, configure Winston
 * @returns {void}
 */
module.exports = function () {
  winston.configure({
    format: combine(
      format.errors({ stack: true }),
      format.timestamp({
        format: function () {
          return new Date().toLocaleString("cs-CZ", {
            timeZone: "Europe/Prague",
          });
        },
      }),
      printf(({ level, message, timestamp, stack }) => {
        return `${timestamp} ${level}: ${message} - ${stack}`;
      }),
      format.metadata()
    ),
    transports: [
      new winston.transports.File({ filename: "winston.log", level: "error" }),
      new winston.transports.MongoDB({
        db: config.get("db"),
        collection: "logs",
        options: { useUnifiedTopology: true, useNewUrlParser: true },
      }),
    ],
    meta: true,
  });

  process.on("uncaughtException", (ex) => {
    console.log(ex);
    winston.error(ex.message, ex);
    process.exit(1);
  });

  process.on("unhandledRejection", (ex) => {
    console.log(ex);
    winston.error(ex.message, ex);
    process.exit(1);
  });
};
