const { checkEditPermissions, getCollection } = require("../models/collection");

/**
 * Middleware function that checks if a user has edit permissions for the given collection
 * @return next() - token is valid
 * @return "401 Access denied" - user does not have "edit" permissions
 * @return "404 Not found" - user does not have access to the collection at all
 */
module.exports = async function edit(req, res, next) {
  // Get the parent collection
  const collection = await getCollection(req.params.id, req.user);
  if (!collection) return res.status(404).send("Collection not found.");
  req.collection = collection;

  // Check if the user has edit permissions for this collection
  if (!checkEditPermissions(collection, req.user))
    return res
      .status(403)
      .send("You are not authorized to edit the collection.");

  next();
};
