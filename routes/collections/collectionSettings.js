const express = require("express");
const _ = require("lodash");
const Joi = require("joi");
const router = express.Router();
const auth = require("../../middleware/auth");
const view = require("../../middleware/view");
const edit = require("../../middleware/edit");
const validateObjID = require("../../middleware/validateObjID");
const { Collection } = require("../../models/collection");
const {
  CollectionSettings,
  validateCollectionSettings,
} = require("../../models/collectionSettings");

/**
 * This endpoint handles everything regarding collection's settings presets
 */

/** GET /collections/empty/settings
 * Get an empty collection settings instance
 */
router.get("/empty/settings", async (req, res) => {
  let settings = new CollectionSettings();
  res.status(200).send(settings);
});

/** GET /collections/:id/settings
 * Get all collection's settings presets
 */
router.get("/:id/settings", [validateObjID, auth, view], async (req, res) => {
  // Get the collection settings
  const collectionSettings = await CollectionSettings.find({
    parent: req.collection._id,
  });
  if (!collectionSettings) return res.status(404).send("Not found.");

  return res.status(200).send(collectionSettings);
});

/** POST /collections/:id/settings
 * Create new collections settings preset
 */
router.post(
  "/:id/settings/new",
  [validateObjID, auth, edit],
  async (req, res) => {
    // Create new, save it and edit the parent collection object
    let newSettings = new CollectionSettings({
      parent: req.collection._id,
    });
    await newSettings.save();

    // Add the new settings preset to the collection
    await Collection.findByIdAndUpdate(req.collection._id, {
      $push: { settings: newSettings._id },
    });

    return res.status(200).send(newSettings);
  }
);

/** PUT /collections/:id/settings/reset
 * Remove all settings presets and create one - the default one
 */
router.put(
  "/:id/settings/reset",
  [validateObjID, auth, edit],
  async (req, res) => {
    // Delete the old settings presets
    await CollectionSettings.deleteMany({ parent: req.collection._id });

    // Create new (default) settings preset
    let newSettings = new CollectionSettings({
      parent: req.collection._id,
    });
    await newSettings.save();

    // Put the default settings preset to the collection
    await Collection.findByIdAndUpdate(req.collection._id, {
      settings: [newSettings],
    });

    return res.status(200).send("Collection settings reseted to default.");
  }
);

/** PUT /collections/:id/settings/:presetId
 * Update a settings preset
 */
router.put(
  "/:id/settings/:presetId",
  [validateObjID, auth, edit],
  async (req, res) => {
    // Validate the update
    const { error } = validateCollectionSettings(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    // Save the changes
    let collectionSettings = await CollectionSettings.findOneAndUpdate(
      { _id: req.params.presetId, parent: req.collection._id },
      _.omit(req.body, ["_id", "__v", "parent"]),
      { new: true }
    );
    if (!collectionSettings) return res.status(404).send("Not found.");

    return res.status(200).send(collectionSettings);
  }
);

/** PATCH /collections/:id/settings/presetId
 * Rename a collection settings preset
 */
router.patch(
  "/:id/settings/:presetId/rename",
  [validateObjID, auth, edit],
  async (req, res) => {
    // Validate the new name
    const payloadSchema = Joi.object({
      name: Joi.string().max(30).required(),
    });
    const { error } = payloadSchema.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    //
    let collectionSettings = await CollectionSettings.findOneAndUpdate(
      { _id: req.params.presetId, parent: req.params.id },
      req.body
    );
    if (!collectionSettings) return res.status(404).send("Preset not found.");
    return res.status(200).send("Updated settings preset name");
  }
);

/** DELETE /collections/:id/settings/:presetId
 * Delete a collection settings preset
 */
router.delete(
  "/:id/settings/:presetId",
  [validateObjID, auth, edit],
  async (req, res) => {
    // Delete the preset
    let collectionSettings = await CollectionSettings.findOneAndDelete({
      _id: req.params.presetId,
      parent: req.params.id,
    });
    if (!collectionSettings) return res.status(404).send("Preset not found.");

    // Remove the collection settings preset from collection object
    await Collection.findByIdAndUpdate(req.params.id, {
      $pull: { settings: req.params.presetId },
    });

    return res.status(200).send("Settings preset deleted.");
  }
);

module.exports = router;
