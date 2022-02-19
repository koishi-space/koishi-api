const config = require("config");

module.exports = function () {
  if (!config.get("jwtpk")) throw new Error("ENV ERROR: KOISHI_JWTPK is not defined");

  if (!config.get("db")) throw new Error("ENV ERROR: KOISHI_DB is not defined");
  
  if (!config.get("email")) throw new Error("ENV ERROR: KOISHI_EMAIL is not defined");

  if (!config.get("web_url")) throw new Error("ENV ERROR: KOISHI_WEB_URL is not defined");

  if (!config.get("telegram_token")) console.log("INFO: KOISHI_TELEGRAM_TOKEN is not set - Telegram bot will not be used");

  if (!config.get("telegram_chat_id")) console.log("INFO: KOISHI_TELEGRAM_CHAT_ID is not set - Telegram bot will not be used");
};
