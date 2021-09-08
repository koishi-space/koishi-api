const config = require("config");

module.exports = function () {
  if (!config.get("jwtpk")) throw new Error("ENV ERROR: jwtpk is not defined");

  if (!config.get("db")) throw new Error("ENV ERROR: db is not defined");
  
  if (!config.get("email")) throw new Error("ENV ERROR: email is not defined");
};
