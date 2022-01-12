const express = require("express");
const _ = require("lodash");
const Joi = require("joi");
const router = express.Router();
const auth = require("../middleware/auth");
const validateObjID = require("../middleware/validateObjID");
const { User } = require("../models/user");
const { Collection, validateCollection } = require("../models/collection");
const {
  CollectionModel,
  validateCollectionModel,
} = require("../models/collectionModel");
const { CollectionData } = require("../models/collectionData");
const { CollectionSettings } = require("../models/collectionSettings");
const { ActionToken } = require("../models/actionToken");

// ===Collection===
router.get("/:id", [validateObjID, auth], async (req, res) => {
  const userId = await getUserIdByEmail(req.user.email);
  let collection;
  if (req.query.noPopulate) {
    collection = await Collection.findOne({
      _id: req.params.id,
      owner: userId,
    });
  } else {
    collection = await Collection.findOne({
      _id: req.params.id,
      owner: userId,
    })
      .populate("model")
      .populate("data")
      .populate("settings");
  }
  if (!collection) return res.status(404).send("Collection not found.");
  else return res.status(200).send(collection);
});

router.get("/", [auth], async (req, res) => {
  const userId = await getUserIdByEmail(req.user.email);
  const collections = await Collection.find({ owner: userId });
  res.status(200).send(collections);
});

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

  // Create and set an empty settings record
  let collectionSettings = new CollectionSettings({
    parent: collection._id,
  });
  await collectionSettings.save();
  collection.settings = collectionSettings._id;

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

router.put("/:id", [validateObjID, auth], async (req, res) => {
  // Validate PUT request payload (only editable field so far is "title")
  const { error } = Joi.object({
    title: Joi.string().max(30).required(),
  }).validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  // Find collection and check ownership
  const userId = await getUserIdByEmail(req.user.email);
  let collection = await Collection.findOne({
    _id: req.params.id,
    owner: userId,
  });
  if (!collection) return res.status(404).send("Collection not found.");

  collection.title = req.body.title;
  collection = await Collection.findByIdAndUpdate(
    collection._id,
    _.omit(collection, ["_id", "__v"]),
    { new: true }
  );
  return res.status(200).send(collection);
});

router.delete("/:id", [validateObjID, auth], async (req, res) => {
  // First time user sends a collection DELETE request, he gets a confirmation token.
  // In order to delete the desired collection, he has to repeat the API call, together with the delete action token
  let userId = await getUserIdByEmail(req.user.email);
  let collection = await Collection.findOne({
    _id: req.params.id,
    owner: userId,
  });
  if (!collection) return res.status(404).send("Collection not found.");

  if (!req.query.actionToken) {
    let deleteToken = new ActionToken({
      purpose: `Delete collection "${collection.title}"`,
      userId: userId,
      targetId: collection._id,
    });
    await deleteToken.save();
    return res.status(202).send(deleteToken);
  } else {
    let deleteToken = await ActionToken.findOne({
      _id: req.query.actionToken,
      userId: userId,
      targetId: collection._id,
    });
    if (!deleteToken)
      return res
        .status(404)
        .send("No valid token found to approve this action.");
    await Collection.findByIdAndDelete(deleteToken.targetId);
    await CollectionModel.findOneAndDelete({ parent: deleteToken.targetId });
    await CollectionData.findOneAndDelete({ parent: deleteToken.targetId });
    await CollectionSettings.findOneAndDelete({ parent: deleteToken.targetId });
    await ActionToken.findByIdAndDelete(deleteToken._id);
    return res.status(200).send("Collection deleted.");
  }
});

// ===CollectionModel===
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

// ===CollectionSettings===
router.get("/:id/settings", [validateObjID, auth], async (req, res) => {
  // Get the parent (collection)
  const userId = await getUserIdByEmail(req.user.email);
  const collection = await Collection.findOne({
    _id: req.params.id,
    owner: userId,
  });
  if (!collection) return res.status(404).send("Collection not found.");

  // Get the collection settings
  const collectionSettings = await CollectionSettings.findOne({
    parent: collection._id,
  });
  if (!collectionSettings)
    return res.status(404).send("This collection has no settings struct.");
  else return res.status(200).send(collectionSettings);
});

router.put("/:id/settings", [validateObjID, auth], async (req, res) => {
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

async function getUserIdByEmail(email) {
  let user = await User.findOne({
    email: email,
  });

  return user ? user._id : null;
}

module.exports = router;
