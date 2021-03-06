const config = require("config");

/**
 * Setup environment for the entire API server.
 * How does the setup work?
 * 1. environment variables are exported in the .env file
 * 2. those variables are then "activated" using the "dotenv" package
 * 3. as they are activted, package "config" will read those 
 *    (have to be specified in /config/custom-environment-variables.json)
 * 4. lastly, all env variables are validated by the function below, and available
 *    with the "config" package
 */

/**
 * Validates environment variables
 * @returns {void}
 * @throws ENV ERROR
 */
module.exports = function () {
  // Required environment variables
  if (!config.get("jwtpk")) throw new Error("ENV ERROR: KOISHI_JWTPK is not defined");
  if (!config.get("db")) throw new Error("ENV ERROR: KOISHI_DB is not defined");
  if (!config.get("web_url")) throw new Error("ENV ERROR: KOISHI_WEB_URL is not defined");
  if (!config.get("use_email")) throw new Error("ENV ERROR: KOISHI_USE_EMAIL is not defined");
  if (!config.get("use_telegram")) throw new Error("ENV ERROR: KOISHI_USE_TELEGRAM is not defined");

  // ENV related to email
  // Email smtp server via nodemailer is used to send verification emails to newly registered users
  // It is not necessary to verify users when you are running the system on local network
  if (config.get("use_email").toString() === "true") {
    if (!config.get("email_host")) throw new Error("ENV ERROR: USE_EMAIL set to \"true\", but KOISHI_EMAIL_HOST is not defined");
    if (!config.get("email_user")) throw new Error("ENV ERROR: USE_EMAIL set to \"true\", but KOISHI_EMAIL_USER is not defined");
    if (!config.get("email_password")) throw new Error("ENV ERROR: USE_EMAIL set to \"true\", but KOISHI_EMAIL_PASSWORD is not defined");
  }

  // ENV related to Telegram
  // Telegram bots are used to send error logs to a group, notifying you about app crashes
  if (config.get("use_telegram").toString() === "true") {
    if (!config.get("telegram_token")) throw new Error("ENV ERROR: USE_TELEGRAM is set to \"true\", but KOISHI_TELEGRAM_TOKEN is not defined");
    if (!config.get("telegram_chat_id")) throw new Error("ENV ERROR: USE_TELEGRAM is set to \"true\", but KOISHI_TELEGRAM_CHAT_ID is not defined");
  }
};
