const express = require("express");
const _ = require("lodash");
const router = express.Router();
const auth = require("../../middleware/auth");
const edit = require("../../middleware/edit");
const view = require("../../middleware/view");
const validateObjID = require("../../middleware/validateObjID");
const { CollectionActions } = require("../../models/collectionActions");
const {
  CollectionData,
  validateRowPayload,
  simplifyCollectionStruct,
} = require("../../models/collectionData");
const { CollectionModel } = require("../../models/collectionModel");

/**
 * This endpoint handles everything regarding the data set of a collection
 */

/** GET /collections/:id/data
 * Get a collection data
 * If a "simplify" query is specified, return the data in a simplified format
 */
router.get("/:id/data", [validateObjID, auth, view], async (req, res) => {
  // Get the collection data
  const collectionData = (
    await CollectionData.findOne({
      parent: req.params.id,
    })
  ).toObject();
  if (!collectionData) return res.status(404).send("Not found");

  // Check if the collection should be simplified
  if (req.query.simplify && req.query.simplify.toString() === "true") {
    collectionData.value = simplifyCollectionStruct(collectionData.value);
  }

  // Return the collection data payload
  return res.status(200).send(collectionData);
});

/** POST /collections/:id/data
 * Add new row to a collection
 */
router.post("/:id/data", [validateObjID, auth, edit], async (req, res) => {
  // Get the collection model and validate the payload (new row)
  let collectionModel = await CollectionModel.findOne({
    parent: req.params.id,
  });
  let validationErrorMessages = validateRowPayload(collectionModel, req.body);
  if (validationErrorMessages.length > 0)
    return res.status(400).send(validationErrorMessages);

  // Run "actions" module
  let collectionActions = await CollectionActions.findOne({
    parent: req.params.id,
  });
  // This is not awaited, because we dont want to wait in case
  // an event report is triggered
  collectionActions.runActions(req.body, req.collection.title, req.params.id);

  // Add new data record and update the collection in db
  await CollectionData.findOneAndUpdate(
    { parent: req.params.id },
    { $push: { value: req.body } }
  );

  // Return a message informing about the result
  return res.status(201).send("Added new row.");
});

/** PUT /collections/:id/data/:index
 * Edit row at an index (starting with "0") specified by URL param :id
 */
router.put(
  "/:id/data/:index",
  [validateObjID, auth, edit],
  async (req, res) => {
    // Get the collection model and validate the payload
    let collectionModel = await CollectionModel.findOne({
      parent: req.params.id,
    });
    let validationErrorMessages = validateRowPayload(collectionModel, req.body);
    if (validationErrorMessages.length > 0)
      return res.status(400).send(validationErrorMessages);

    // Run "actions" module
    let collectionActions = await CollectionActions.findOne({
      parent: req.params.id,
    });
    // This is not awaited, because we dont want to wait in case
    // an event report is triggered
    collectionActions.runActions(req.body, req.collection.title, req.params.id);

    // Change the item in array "value" of CollectionData
    await CollectionData.findOneAndUpdate(
      { parent: req.params.id },
      { $set: { [`value.${req.params.index}`]: req.body } }
    );

    // I didnt really find a way to get to know if the operation was successful (could go wrong when index out of bounds)
    // so that could be the subject of future implementation
    return res.status(200).send(`Edited row at index ${req.params.index}`);
  }
);

/** DELETE /collections/:id/data/:index
 * Delete row at an index specified by URL param :id
 */
router.delete(
  "/:id/data/:index",
  [validateObjID, auth, edit],
  async (req, res) => {
    // This is an old workaround for MongoDB - deleting an element from the collection specified by index
    // NOTE: There may be a better solution, but this seems the least complicated
    // ...see https://stackoverflow.com/questions/4588303/in-mongodb-how-do-you-remove-an-array-element-by-its-index
    await CollectionData.findOneAndUpdate(
      { parent: req.params.id },
      { $unset: { [`value.${req.params.index}`]: 1 } }
    );
    await CollectionData.findOneAndUpdate(
      { parent: req.params.id },
      { $pull: { [`value`]: null } }
    );

    // I didnt really find a way to get to know if the operation was successful (could go wrong when index out of bounds)
    // so that could be the subject of future implementation
    return res.status(200).send(`Removed row at index ${req.params.index}`);
  }
);

module.exports = router;
