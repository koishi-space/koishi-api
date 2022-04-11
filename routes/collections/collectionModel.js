const express = require("express");
const auth = require("../../middleware/auth");
const router = express.Router();
const { getCollection } = require("../../models/collection");
const { CollectionModel } = require("../../models/collectionModel");
const validateObjID = require("../../middleware/validateObjID");

// ===CollectionModel===
// This endpoint handles everything regarding the data structure of a collection

router.get("/:id/model", [validateObjID, auth], async (req, res) => {
  // Get the parent (collection)
  const collection = await getCollection(req.params.id, req.user);
  if (!collection) return res.status(404).send("Collection not found.");

  // Get the collection model
  const collectionModel = await CollectionModel.findOne({
    parent: collection._id,
  });
  if (!collectionModel)
    return res.status(404).send("This collection has no model struct.");
  else return res.status(200).send(collectionModel);
});

module.exports = router;
