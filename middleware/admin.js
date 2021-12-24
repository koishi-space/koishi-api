/**
 * Middleware function to validate if token has admin privilges
 *
 * @param {object} req req object for HTTP endpoint
 * @param {object} res res object for HTTP endpoint
 * @param {function} next callback to exit middleware
 * @return next() - token has admin privileges
 * @returns "403 Forbidden" - token does not have admin privileges
 */

module.exports = function admin(req, res, next) {
  if (req.user.isAdmin) next();
  else return res.status(403).send("Forbidden - you are not an admin.");
};
