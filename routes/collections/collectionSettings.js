const express = require("express");
const _ = require("lodash");
const Joi = require("joi");
const router = express.Router();
const auth = require("../../middleware/auth");
const validateObjID = require("../../middleware/validateObjID");
const {
  Collection,
  checkEditPermissions,
  getCollection,
} = require("../../models/collection");
const {
  CollectionSettings,
  validateCollectionSettings,
} = require("../../models/collectionSettings");

// ===CollectionSettings===
// This endpoint handles everything regarding collection's settings presets

router.get("/:id/settings", [validateObjID, auth], async (req, res) => {
  // Get the parent (collection)
  const collection = await getCollection(req.params.id, req.user);
  if (!collection) return res.status(404).send("Collection not found.");

  // Get the collection settings
  const collectionSettings = await CollectionSettings.find({
    parent: collection._id,
  });
  if (!collectionSettings)
    return res.status(404).send("This collection has no settings struct.");
  else return res.status(200).send(collectionSettings);
});

router.post("/:id/settings/new", [validateObjID, auth], async (req, res) => {
  // Get the parent (collection)
  let collection = await getCollection(req.params.id, req.user);
  if (!collection) return res.status(404).send("Collection not found.");

  // Check for edit permissions
  if (!checkEditPermissions(collection, req.user))
    return res
      .status(403)
      .send("You are not authorized to edit the collection.");

  // Create new, save it and edit the parent collection object
  let newSettings = new CollectionSettings({
    parent: collection._id,
  });
  await newSettings.save();
  collection.settings.push(newSettings._id);
  await Collection.findByIdAndUpdate(
    collection._id,
    _.omit(collection, ["_id", "__v"])
  );
  return res.status(200).send(newSettings);
});

router.put("/:id/settings/reset", [validateObjID, auth], async (req, res) => {
  // Get the parent (collection)
  let collection = await getCollection(req.params.id, req.user);
  if (!collection) return res.status(404).send("Collection not found.");

  // Check for edit permissions
  if (!checkEditPermissions(collection, req.user))
    return res
      .status(403)
      .send("You are not authorized to edit the collection.");

  // Delete the old settings object
  await CollectionSettings.deleteMany({ parent: collection._id });

  // Create new, save it and edit the parent collection object
  let newSettings = new CollectionSettings({
    parent: collection._id,
  });
  await newSettings.save();
  collection.settings = [];
  collection.settings[0] = newSettings._id;
  await Collection.findByIdAndUpdate(
    collection._id,
    _.omit(collection, ["_id", "__v"])
  );
  return res.status(200).send("Collection settings reseted to default.");
});

router.put(
  "/:id/settings/:settings_id",
  [validateObjID, auth],
  async (req, res) => {
    // Validate
    const { error } = validateCollectionSettings(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    // Get the parent (collection)
    const collection = await getCollection(req.params.id, req.user);
    if (!collection) return res.status(404).send("Collection not found.");

    // Check for edit permissions
    if (!checkEditPermissions(collection, req.user))
      return res
        .status(403)
        .send("You are not authorized to edit the collection.");

    // Save the changes
    let collectionSettings = await CollectionSettings.findOneAndUpdate(
      { _id: req.params.settings_id, parent: collection._id },
      _.omit(req.body, ["_id", "__v", "parent"]),
      { new: true }
    );
    if (!collectionSettings)
      return res.status(404).send("Collection settings preset not found.");
    return res.status(200).send(collectionSettings);
  }
);

router.patch(
  "/:id/settings/:settings_id/rename",
  [validateObjID, auth],
  async (req, res) => {
    // Get the parent (collection)
    let collection = await getCollection(req.params.id, req.user);
    if (!collection) return res.status(404).send("Collection not found.");

    // Check for edit permissions
    if (!checkEditPermissions(collection, req.user))
      return res
        .status(403)
        .send("You are not authorized to edit the collection.");

    // Validate the new name
    const payloadSchema = Joi.object({
      name: Joi.string().max(30).required(),
    });
    const { error } = payloadSchema.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    let collectionSettings = await CollectionSettings.findOneAndUpdate(
      { _id: req.params.settings_id, parent: req.params.id },
      req.body
    );
    if (!collectionSettings)
      return res.status(404).send("Collection settings preset not found.");
    return res.status(200).send("Updated settings preset name");
  }
);

router.delete(
  "/:id/settings/:settings_id",
  [validateObjID, auth],
  async (req, res) => {
    // Get the parent (collection)
    let collection = await getCollection(req.params.id, req.user);
    if (!collection) return res.status(404).send("Collection not found.");

    // Check for edit permissions
    if (!checkEditPermissions(collection, req.user))
      return res
        .status(403)
        .send("You are not authorized to edit the collection.");

    // // Delete the collection settings
    let collectionSettings = await CollectionSettings.findOneAndDelete({
      _id: req.params.settings_id,
      parent: req.params.id,
    });
    if (!collectionSettings)
      return res.status(404).send("Collection settings preset not found.");

    // Remove the collection settings from collection object
    for (let s in collection.settings)
      if (collection.settings[s].toString() === req.params.settings_id) {
        collection.settings.splice(s, 1);
        break;
      }
    await Collection.findByIdAndUpdate(
      collection._id,
      _.omit(collection, ["_id, __v"])
    );
    return res.status(200).send("Settings preset deleted.");
  }
);

module.exports = router;
