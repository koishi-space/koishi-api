const express = require("express");
const auth = require("../../middleware/auth");
const view = require("../../middleware/view");
const router = express.Router();
const { getCollection } = require("../../models/collection");
const { CollectionModel } = require("../../models/collectionModel");
const validateObjID = require("../../middleware/validateObjID");

/**
 * This endpoint handles everything regarding the data structure of a collection
 */

/** GET /collections/:id/model
 * Get the model specifying the collection's data structure
 */
router.get("/:id/model", [validateObjID, auth, view], async (req, res) => {
  // Get the collection model
  const collectionModel = await CollectionModel.findOne({
    parent: req.params.id,
  });
  if (!collectionModel) return res.status(404).send("Not found.");

  return res.status(200).send(collectionModel);
});

module.exports = router;
