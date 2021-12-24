const express = require("express");
const Joi = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { User } = require("../models/user");
const { Collection, validateCollection } = require("../models/colection");
const {
  CollectionModel,
  validateCollectionModel,
} = require("../models/collectionModel");
const { CollectoinData, CollectionData } = require("../models/collectionData");

// TODO: Implement data hashing for user's privacy
router.post("/", [auth], async (req, res) => {
  // Validate collection title
  if (!(req.body.title && req.body.title.length <= 20))
    return res
      .status(400)
      .send("Collection title has min 1 and max 30 characters long.");

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

async function getUserIdByEmail(email) {
  let user = await User.findOne({
    email: email,
  });

  return user ? user._id : null;
}

module.exports = router;
