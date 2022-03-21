const winston = require("winston");
const config = require("config");
const TelegramBot = require("node-telegram-bot-api");

/**
 * Middleware function to catch and log unhandled errors
 *
 * @param {*} err error object from HTTP endpoint
 * @param {*} req req object for HTTP endpoint
 * @param {*} res res object for HTTP endpoint
 * @param {*} next callback to exit middleware
 * @return {void} "500 Internal server error" - this gets returned always
 */
module.exports = function (err, req, res, next) {
  // Winston logging
  winston.error(err.message, err);
  
  // Local error logging
  console.log(err);

  // Telegram bot error logging
  if (config.get("use_telegram")) {
    try {
      let message = `[ERROR]: ${req.url}\n${err.message}`;
      bot = new TelegramBot(config.get("telegram_token"));
      bot.sendMessage(config.get("telegram_chat_id"), message);
    } catch (ex) {
      console.log("Failed to send error report to Telegram: " + ex.message);
    }
  }

  res.status(500).send("Internal server error");
};
