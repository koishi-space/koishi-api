const mongoose = require("mongoose");

/**
 * Check if the supplied id is a valid Mongodb ObjectId
 * @return next() - req.params.id is a valid MongoDB ObjectId
 * @return "400 Invalid ID" - req.params.id is not a valid ObjectId
 */
module.exports = function (req, res, next) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(400).send("Invalid ID");

  next();
};
