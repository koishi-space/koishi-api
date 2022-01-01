const express = require("express");
const _ = require("lodash");
const router = express.Router();
const auth = require("../middleware/auth");
const validateObjID = require("../middleware/validateObjID");
const { User } = require("../models/user");
const { Collection, validateCollection } = require("../models/colection");
const {
  CollectionModel,
  validateCollectionModel,
} = require("../models/collectionModel");
const { CollectionData } = require("../models/collectionData");

// TODO: Implement data hashing for user's privacy
// TODO: implement custom data structure validation (when adding new record to the collection data struct)

// ===Collection===
// Get the whole, populated collection struct
router.get("/:id", [validateObjID, auth], async (req, res) => {
  const userId = await getUserIdByEmail(req.user.email);
  const collection = await Collection.findOne({
    _id: req.params.id,
    owner: userId,
  })
    .populate("model")
    .populate("data");
  if (!collection) return res.status(404).send("Collection not found.");
  else return res.status(200).send(collection);
});

// Get all user's collections
router.get("/", [auth], async (req, res) => {
  const userId = await getUserIdByEmail(req.user.email);
  const collections = await Collection.find({ owner: userId });
  res.status(200).send(collections);
});

// Create new collection
router.post("/", [auth], async (req, res) => {
  // Validate collection title
  if (!(req.body.title && req.body.title.length <= 20))
    return res
      .status(400)
      .send("Collection title can be min 1 and max 30 characters long.");

  // Prepare Collection data structure
  let collection = new Collection({ title: req.body.title });

  // Check and set ownership
  let user_id = await getUserIdByEmail(req.user.email);
  if (!user_id) return res.status(400).send("Creator does not exist.");
  collection.owner = user_id;

  // Create and set an empty data record
  let collectionData = new CollectionData({
    parent: collection._id,
    value: [],
  });
  await collectionData.save();
  collection.data = collectionData._id;

  // Create and set collection model if it is valid
  const { error } = validateCollectionModel(req.body.model, true);
  if (error) return res.status(400).send(error.details[0].message);
  let collectionModel = new CollectionModel({
    parent: collection._id,
    value: req.body.model,
  });
  collection.model = collectionModel._id;
  await collectionModel.save();

  // Save the newly created collection
  await collection.save();

  return res.status(201).send(collection);
});

// ===CollectionModel===
// Get the collection model struct
router.get("/:id/model", [validateObjID, auth], async (req, res) => {
  // Get the parent (collection)
  const userId = await getUserIdByEmail(req.user.email);
  const collection = await Collection.findOne({
    _id: req.params.id,
    owner: userId,
  });
  if (!collection) return res.status(404).send("Collection not found.");

  // Get the collection model
  const collectionModel = await CollectionModel.findOne({
    parent: collection._id,
  });
  if (!collectionModel)
    return res.status(404).send("This collection has no model struct.");
  else return res.status(200).send(collectionModel);
});

// ===CollectionData===
// Get the collection data struct
router.get("/:id/data", [validateObjID, auth], async (req, res) => {
  // Get the parent (collection)
  const userId = await getUserIdByEmail(req.user.email);
  const collection = await Collection.findOne({
    _id: req.params.id,
    owner: userId,
  });
  if (!collection) return res.status(404).send("Collection not found.");

  // Get the collection data
  const collectionData = await CollectionData.findOne({
    parent: collection._id,
  });
  if (!collectionData)
    return res.status(404).send("This collection has no data struct.");
  else return res.status(200).send(collectionData);
});

// Adds new row to the collection data struct
router.post("/:id/data", [validateObjID, auth], async (req, res) => {
  // Get the parent collection
  const userId = await getUserIdByEmail(req.user.email);
  const collection = await Collection.findOne({
    _id: req.params.id,
    owner: userId,
  });
  if (!collection) return res.status(404).send("Collection not found.");

  // Get the collection data
  let collectionData = await CollectionData.findOne({
    parent: collection._id,
  });
  if (!collectionData)
    return res.status(404).send("This collection has no data struct.");

  // Add new data record
  collectionData.value.push(req.body);

  // Update the collection data struct in db
  collectionData = await CollectionData.findByIdAndUpdate(
    collectionData._id,
    _.omit(collectionData, ["_id", "__v"]),
    { new: true }
  );
  res.status(200).send("Added new row.");
});

// Removes one row from the collection data struct (and returns the updated version if specified so via the "getUpdated" query parameter)
router.delete("/:id/data/:index", [validateObjID, auth], async (req, res) => {
  // Get the parent collection
  const userId = await getUserIdByEmail(req.user.email);
  const collection = await Collection.findOne({
    _id: req.params.id,
    owner: userId,
  });
  if (!collection) return res.status(404).send("Collection not found.");

  // Get the collection data
  let collectionData = await CollectionData.findOne({
    parent: collection._id,
  });
  if (!collectionData)
    return res.status(404).send("This collection has no data struct.");

  // Delete desired row
  collectionData.value.splice(req.params.index, 1);

  // Save the edited collection data struct to db
  collectionData = await CollectionData.findByIdAndUpdate(
    collectionData._id,
    _.omit(collectionData, ["_id", "__v"]),
    { new: true }
  );
  res.status(200).send(`Removed row at index ${req.params.index}`);
});

async function getUserIdByEmail(email) {
  let user = await User.findOne({
    email: email,
  });

  return user ? user._id : null;
}

module.exports = router;
