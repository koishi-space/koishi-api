const config = require("config");
const jwt = require("jsonwebtoken");

/**
 * Middleware function for authenticating API tokens
 * @return next() - token is valid
 * @return "401 Access denied" - token has not been provided
 * @return "400 Invalid token" - token is not valid
 */
module.exports = function auth(req, res, next) {
  // API tokens are supplied via x-auth-token header
  const token = req.header("x-auth-token");

  if (!token) return res.status(401).send("Access denied. No token provided.");

  // Verify the token
  try {
    const decoded = jwt.verify(token, config.get("jwtpk"));
    req.user = decoded;
    next();
  } catch (ex) {
    res.status(400).send("Access denied. Invalid token.");
  }
};
