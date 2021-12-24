const winston = require("winston");

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
  winston.error(err.message, err);
  console.log(err);

  res.status(500).send("Internal server error");
};
