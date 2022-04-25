/**
 * Middleware function to validate if token has admin privileges
 * @return next() - token has admin privileges
 * @return "403 Forbidden" - token does not have admin privileges
 */
module.exports = function admin(req, res, next) {
  if (req.user.isAdmin) next(); // is admin
  else return res.status(403).send("Forbidden - you are not an admin."); // is not admin
};
