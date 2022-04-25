const { checkEditPermissions, getCollection } = require("../models/collection");

/**
 * Middleware function that checks if a user has view permissions for the given collection
 * @return next() - token is valid
 * @return "401 Access denied" - user does not have "edit" permissions
 * @return "404 Not found" - user does not have access to the collection at all
 */
module.exports = async function view(req, res, next) {
  // Get the parent collection
  const collection = await getCollection(req.params.id, req.user);
  if (!collection) return res.status(404).send("Collection not found.");
  req.collection = collection;

  next();
};
