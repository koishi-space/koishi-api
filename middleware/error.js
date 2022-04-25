const winston = require("winston");
const config = require("config");
const { telegramLogError } = require("../services/telegramConnector");

/**
 * Middleware function to catch and log unhandled errors and exceptions
 * @return {void} "500 Internal server error" - this gets returned always
 */
module.exports = function (err, req, res, next) {
  // Winston logging
  winston.error(err.message, err);

  // Local error logging
  console.log(err);

  // Telegram bot error logging
  if (config.get("use_telegram").toString() === "true") {
    try {
      telegramLogError(req, err);
    } catch (ex) {
      console.log("Failed to send error report to Telegram: " + ex.message);
    }
  }

  res.status(500).send("Internal server error");
};
