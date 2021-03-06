const mongoose = require("mongoose");
const winston = require("winston");
const config = require("config");

/**
 * Manage DB connections
 */

/**
 * Connect to a MongoDB database using the mongoose package
 * @returns {void}
 */
module.exports = function () {
  let conn = config.get("db");

  mongoose
    .connect(conn, { useUnifiedTopology: true, useNewUrlParser: true })
    .then(() => {
      let url = conn.includes("localhost") ? "localhost" : "atlas cloud";
      console.log(`[SERVER] Connected to MongoDB on (${url})`);
      winston.info(`Connected to MongoDB on (${url})`);
    });
};
