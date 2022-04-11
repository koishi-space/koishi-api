const express = require("express");
const _ = require("lodash");
const router = express.Router();
const auth = require("../../middleware/auth");
const validateObjID = require("../../middleware/validateObjID");
const {
  checkEditPermissions,
  getCollection,
} = require("../../models/collection");
const {
  CollectionData,
  validateRowPayload,
} = require("../../models/collectionData");
const { CollectionModel } = require("../../models/collectionModel");

// ===CollectionData===
// This endpoint handles everything regarding the data set of a collection

/**
 * @api {get} /collections/:id/data Request collection's dataset
 * @apiName GetCollecionData
 * @apiGroup CollectionData
 *
 * @apiHeader x-auth-token Koishi API's authentication token
 * 
 * @apiParam {ObjId} id Id of the collection
 *
 * @apiError (404) {Text} Collection Collection not found
 * @apiError (404) {Text} CollectionData Collection has no data
 * 
 * @apiSuccess {CollectionData[]} CollectionData Dataset of the specified collection
 * @apiSuccessExample {json} Example response:
 * {
    "_id": "620914ef11cf792b60ede4ec",
    "parent": "620914ef11cf792b60ede4ea",
    "value": [
        [
            {
                "column": "Category",
                "data": "a",
                "_id": "6209150911cf792b60ede50f"
            },
            {
                "column": "Value",
                "data": "1",
                "_id": "6209150911cf792b60ede510"
            }
        ],
        [
            {
                "column": "Category",
                "data": "b",
                "_id": "6209151711cf792b60ede52f"
            },
            {
                "column": "Value",
                "data": "3",
                "_id": "6209151711cf792b60ede530"
            }
        ]
    ],
    "__v": 0
}
 */
router.get("/:id/data", [validateObjID, auth], async (req, res) => {
  // Get the parent (collection)
  const collection = await getCollection(req.params.id, req.user);
  if (!collection) return res.status(404).send("Collection not found.");

  // Get the collection data
  const collectionData = await CollectionData.findOne({
    parent: collection._id,
  });
  if (!collectionData) return res.status(404).send("Collection has no data.");
  // Return the collection data payload
  else return res.status(200).send(collectionData);
});

/**
 * @api {post} /collections/:id/data Add new row to a collection
 * @apiName PostCollecionData
 * @apiGroup CollectionData
 *
 * @apiHeader x-auth-token Koishi API's authentication token
 * 
 * @apiParam {ObjectID} id Id of the collection
 * 
 * @apiBody {CollectionDataValue[]} The new row
 * 
 * @apiExample {json} Example row payload:
 * [
    {
        "column": "Category",
        "data": "a"
    },
    {
        "column": "Value",
        "data": 23
    }
]
 * 
 * @apiError (Error 400) {Text} Row Row is not valid
 * @apiError (Error 403) {Text} Authentication You are not authorized to edit the collection
 * @apiError (Error 404) {Text} Collection Collection not found
 * @apiError (Error 404) {Text} CollectionData Collection has no data
 * 
 * @apiSuccess (Success 201) {Text} Message Added new row
 */
router.post("/:id/data", [validateObjID, auth], async (req, res) => {
  // Get the parent collection
  const collection = await getCollection(req.params.id, req.user);
  if (!collection) return res.status(404).send("Collection not found.");

  // Check if the user has edit permissions for this collection
  if (!checkEditPermissions(collection, req.user))
    return res
      .status(403)
      .send("You are not authorized to edit the collection.");

  // Get the collection model and validate the payload (new row)
  let collectionModel = await CollectionModel.findOne({
    parent: collection._id,
  });
  let validationErrorMessages = validateRowPayload(collectionModel, req.body);
  if (validationErrorMessages.length > 0)
    return res.status(400).send(validationErrorMessages);

  // Get the collection data
  let collectionData = await CollectionData.findOne({
    parent: collection._id,
  });
  if (!collectionData) return res.status(404).send("Collection has no data.");

  // Add new data record and update the collection in db
  await CollectionData.findByIdAndUpdate(
    { parent: collection._id },
    { $push: { value: req.body } }
  );

  // Return a message informing about the result
  return res.status(201).send("Added new row.");
});

/**
 * @api {put} /collections/:id/data/:index Edit row at index (starting with "0")
 * @apiName PutCollectionData
 * @apiGroup CollectionData
 *
 * @apiHeader x-auth-token Koishi API's authentication token
 * 
 * @apiParam {ObjectID} id Id of the collection
 * @apiParam {int} index Index of the row (index of the first row is "0")
 * 
 * @apiBody {CollectionDataValue[]} The edited row
 * 
 * @apiExample {json} Example row payload:
 * [
    {
        "column": "Category",
        "data": "a"
    },
    {
        "column": "Value",
        "data": 28
    }
]
 * 
 * @apiError (Error 400) {Text} Row Row is not valid
 * @apiError (Error 403) {Text} Authentication You are not authorized to edit the collection
 * @apiError (Error 404) {Text} Collection Collection not found
 * @apiError (Error 404) {Text} CollectionData Collection has no data
 * 
 * @apiSuccess (Success 200) {Text} Message Edited row at index <index>
 */
router.put("/:id/data/:index", [validateObjID, auth], async (req, res) => {
  // Get the parent collection
  const collection = await getCollection(req.params.id, req.user);
  if (!collection) return res.status(404).send("Collection not found.");

  // Check if the user has edit permissions for this collection
  if (!checkEditPermissions(collection, req.user))
    return res
      .status(403)
      .send("You are not authorized to edit the collection.");

  // Get the collection data and check if the index is out of bounds
  let collectionData = await CollectionData.findOne({
    parent: collection._id,
  });
  if (!collectionData) return res.status(404).send("Collection has no data.");
  if (!collectionData.value[req.params.index])
    return res.status(400).send("Index out of bounds.");

  // Get the collection model and validate the payload
  let collectionModel = await CollectionModel.findOne({
    parent: collection._id,
  });
  let validationErrorMessages = validateRowPayload(collectionModel, req.body);
  if (validationErrorMessages.length > 0)
    return res.status(400).send(validationErrorMessages);

  // Edit the specified row
  collectionData.value[req.params.index] = req.body;

  // Save the edited collection data to db
  collectionData = await CollectionData.findByIdAndUpdate(
    collectionData._id,
    _.omit(collectionData, ["_id", "__v"]),
    { new: true }
  );

  //
  return res.status(200).send(`Edited row at index ${req.params.index}`);
});

/**
 * @api {delete} /collections/:id/data/:index Delete row at index
 * @apiGroup CollectionData
 *
 * @apiHeader x-auth-token Koishi API's authentication token
 *
 * @apiParam {ObjectID} id Id of the collection
 * @apiParam {int} index Index of the row (index of the first row is "0")
 *
 * @apiError (Error 403) {Text} Authentication You are not authorized to edit the collection
 * @apiError (Error 404) {Text} Collection Collection not found
 * @apiError (Error 404) {Text} CollectionData Collection has no data
 *
 * @apiSuccess (Success 200) {Text} Message Removed row at index <index>
 */
router.delete("/:id/data/:index", [validateObjID, auth], async (req, res) => {
  // Get the parent collection
  const collection = await getCollection(req.params.id, req.user);
  if (!collection) return res.status(404).send("Collection not found.");

  // Check if the user has edit permissions for this collection
  if (!checkEditPermissions(collection, req.user))
    return res
      .status(403)
      .send("You are not authorized to edit the collection.");

  // Get the collection data
  let collectionData = await CollectionData.findOne({
    parent: collection._id,
  });
  if (!collectionData) return res.status(404).send("Collection has no data.");

  // Check if the index is out of bounds
  if (!collectionData.value[req.params.index])
    return res.status(400).send("Index out of bounds.");

  // Delete the desired row
  collectionData.value.splice(req.params.index, 1);

  // Save the edited collection data struct to db
  collectionData = await CollectionData.findByIdAndUpdate(
    collectionData._id,
    _.omit(collectionData, ["_id", "__v"]),
    { new: true }
  );
  return res.status(200).send(`Removed row at index ${req.params.index}`);
});

module.exports = router;
