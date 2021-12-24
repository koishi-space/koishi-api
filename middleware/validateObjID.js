const mongoose = require("mongoose");

/**
 * MongoDB _id validation
 *
 * @param {object} req req object for HTTP endpoint
 * @param {object} res res object for HTTP endpoint
 * @param {function} next callback to exit middleware
 * @return next() - req.params.id is a valid MongoDB id
 * @return "400 Invalid ID" - req.params.id is not a valid id
 */
module.exports = function (req, res, next) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(400).send("Invalid ID");

  next();
};
