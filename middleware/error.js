const winston = require("winston");
const config = require("config");
const TelegramBot = require("node-telegram-bot-api");

/**
 * Middleware function to catch unhandled errors
 *
 * @param {*} err error object from HTTP endpoint
 * @param {*} req req object for HTTP endpoint
 * @param {*} res res object for HTTP endpoint
 * @param {*} next callback to exit middleware
 * @return "500 Internal server error" - this gets returned always
 */
module.exports = function (err, req, res, next) {
  // Winston logging
  winston.error(err.message, err);
  
  // Local error logging
  console.log(err);

  // Telegram bot (koishi_api_bot) error logging
  if (config.get("telegram_token") && config.get("telegram_chat_id")) {
    let message = `[ERROR]: ${req.url}\n${err.message}`;
    bot = new TelegramBot(config.get("telegram_token"));
    bot.sendMessage(config.get("telegram_chat_id"), message);
  }


  res.status(500).send("Internal server error");
};
