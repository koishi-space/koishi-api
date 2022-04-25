const express = require("express");
const _ = require("lodash");
const Joi = require("joi");
const router = express.Router();
const auth = require("../../middleware/auth");
const edit = require("../../middleware/edit");
const validateObjID = require("../../middleware/validateObjID");
const { User } = require("../../models/user");
const { Collection, getCollection } = require("../../models/collection");
const { CollectionData } = require("../../models/collectionData");
const { ActionToken } = require("../../models/actionToken");
const {
  CollectionModel,
  validateCollectionModel,
} = require("../../models/collectionModel");
const { CollectionSettings } = require("../../models/collectionSettings");
const { CollectionActions } = require("../../models/collectionActions");

/**
 * This endpoint handles everything about collections (the plain collection object - subobjects
 * like ColletionData, CollectionModel, CollectinoSettings etc. have each a dedicated endpoint)
 */

/** GET /collections/public/:id
 * Get a public collection, specified by its and populate all it's fields
 */
router.get("/public/:id", [validateObjID], async (req, res) => {
  let collection;
  try {
    collection = (
      await Collection.findOne({ _id: req.params.id, isPublic: true })
        .select("-sharedTo")
        .populate("model")
        .populate("settings")
        .populate("data")
        .populate("owner")
    ).toObject();
  } catch (ex) {
    // If the collection was not found, the "toObject()" method will throw an error,
    // meaning that the collection does not exist (or is no longer public)
    return res.status(404).send("Collection not found.");
  }

  // Change the owner string
  collection.owner = collection.owner.name;

  return res.status(200).send(collection);
});

/** GET /collections/public
 * Get all public collections (just the plain object, do not populate it's fields)
 */
router.get("/public", [], async (req, res) => {
  let collections = await Collection.find({ isPublic: true }, "-sharedTo", {
    lean: true,
  }).populate("owner");

  for (let c of collections) {
    if (req.query.fetchOwners.toString() === "true") c.owner = c.owner.name;
    else c.owner = c.owner._id;
  }

  res.status(200).send(collections);
});

/** GET /collections/:id
 * Get a collection specific by its id.
 * By default, all the collection's fields are populated. That behaviour can be
 * supressed by setting the noPopulate=true prameter in url query
 */
router.get("/:id", [validateObjID, auth], async (req, res) => {
  let collection;

  // Whether to populate the collection's fields or not
  if (req.query.noPopulate) {
    collection = (await getCollection(req.params.id, req.user)).toObject();
  } else {
    collection = (
      await getCollection(req.params.id, req.user, true)
    ).toObject();
  }

  if (!collection) return res.status(404).send("Collection not found.");

  // Change the "owner" value to a readable string format
  let user = await User.findById(collection.owner);
  collection.ownerString = `${user.name} (${
    user.email === req.user.email ? "you" : user.email
  })`;
  return res.status(200).send(collection);
});

/** GET /collections
 * Get all collections that belong to a given user (via the auth token)
 */
router.get("/", [auth], async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) return res.status(400).send("This user no longer exists.");
  let collections = await Collection.find({
    $and: [
      { _id: { $in: user.collections } },
      {
        $or: [
          { owner: user._id },
          { sharedTo: { $elemMatch: { $eq: user._id } } },
        ],
      },
    ],
  });
  return res.status(200).send(collections);
});

/** POST /collections
 * Create a new collection
 */
router.post("/", [auth], async (req, res) => {
  // Validate collection title
  let { error } = Joi.object({
    title: Joi.string().max(30).required(),
    model: Joi.any(),
  }).validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  // Prepare Collection data structure
  let collection = new Collection({ title: req.body.title });

  // Check and set ownership
  let user = (await User.findById(req.user._id)).toObject();
  if (!user) return res.status(400).send("Creator does not exist.");
  collection.owner = user._id; //
  user.collections.push(collection._id);

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
  collection.settings = [];
  collection.settings[0] = collectionSettings._id;

  // Create and set an empty actions record
  let collectionActions = new CollectionActions({
    parent: collection._id,
    value: [],
  });
  await collectionActions.save();
  collection.actions = collectionActions._id;

  // Create and set collection model if it is valid
  error = validateCollectionModel(req.body.model, true).error;
  if (error) return res.status(400).send(error.details[0].message);
  let collectionModel = new CollectionModel({
    parent: collection._id,
    value: req.body.model,
  });
  collection.model = collectionModel._id;
  await collectionModel.save();

  // Save the newly created collection and altered user
  await collection.save();
  await User.findByIdAndUpdate(user._id, _.omit(user, ["__v", "_id"]));

  return res.status(201).send(collection);
});

/** FETCH /collections/
 * Change the colletion title
 */
router.patch("/:id", [validateObjID, auth, edit], async (req, res) => {
  // Validate PUT request payload (only editable field so far is "title")
  const { error } = Joi.object({
    title: Joi.string().max(30).required(),
  }).validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  let updated = await Collection.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  return res.status(200).send(updated);
});

/** DELETE /collections/:id
 * Delete a collection. The only person who can delete a collection is the owner.
 * Delete process: first time user sends a collection DELETE request, he gets a confirmation
 * token. In order to delete the desired collection, he has to repeat the API call, together
 * with the delete action token.
 */
router.delete("/:id", [validateObjID, auth], async (req, res) => {
  // Find the collection's owner
  let user = (await User.findById(req.user._id)).toObject();
  let collection = await Collection.findOne({
    _id: req.params.id,
    owner: user._id,
  });
  if (!collection) return res.status(404).send("Collection not found.");

  if (!req.query.actionToken) {
    // This is the first request. The action token will be returned
    let deleteToken = new ActionToken({
      purpose: `Delete collection "${collection.title}"`,
      userId: user._id,
      targetId: collection._id,
    });
    await deleteToken.save();
    return res.status(202).send(deleteToken);
  } else {
    // This time the action token was provided, confirming the action. The collection
    // will now be deleted
    let deleteToken = await ActionToken.findOne({
      _id: req.query.actionToken,
      userId: user._id,
      targetId: collection._id,
    });
    if (!deleteToken)
      return res
        .status(404)
        .send("No valid token found to approve this action.");

    // Remove the collection from the owner's list of colections
    const index = user.collections.indexOf(collection._id);
    user.collections.splice(index, 1);
    await User.findByIdAndUpdate(user._id, user);

    // Remove the collection from the list of collections for each
    // user that the collection was shared to
    for (share of collection.sharedTo) {
      await User.findOneAndUpdate(
        { email: share.email },
        { $pull: { collections: collection._id } }
      );
    }

    // Remove the collection itself and all its children objects
    await Collection.findByIdAndDelete(deleteToken.targetId);
    await CollectionModel.findOneAndDelete({ parent: deleteToken.targetId });
    await CollectionData.findOneAndDelete({ parent: deleteToken.targetId });
    await CollectionActions.findOneAndDelete({ parent: deleteToken.targetId });
    await CollectionSettings.deleteMany({ parent: deleteToken.targetId });

    // Finally, delete the action confirmation token
    await ActionToken.findByIdAndDelete(deleteToken._id);

    return res.status(200).send("Collection deleted.");
  }
});

/** POST /collections/realtime/save
 * Save a realtime session as a regular collection
 */
router.post("/realtime/save", [auth], async (req, res) => {
  // Get the user
  let user = (await User.findById(req.user._id)).toObject();

  // Prepare the collection structure
  let collection = new Collection({
    title: req.body.title,
    owner: user._id,
  });

  // Create and set the supplied data record
  // Cast the data structure to fit the one needed in db
  let dataCasted = [];

  for (const row of req.body.sessionData) {
    let rowCasted = [];
    Object.keys(row).forEach((k) => {
      rowCasted.push({
        column: k,
        data: row[k],
      });
    });
    dataCasted.push(rowCasted);
  }
  let collectionData = new CollectionData({
    parent: collection._id,
    value: dataCasted,
  });
  collection.data = collectionData._id;

  // Create and set collection model if it is valid
  let error = validateCollectionModel(req.body.model, true).error;
  if (error) return res.status(400).send(error.details[0].message);
  let collectionModel = new CollectionModel({
    parent: collection._id,
    value: req.body.model,
  });
  collection.model = collectionModel._id;

  // Save the existing graph settings as the default setting preset
  let collectionSettings = new CollectionSettings({
    ...req.body.settings,
    parent: collection._id,
  });
  let presets = [];
  presets.push(collectionSettings._id);
  collection.settings = presets;

  // Save the collection and its parts and add it to user's collections
  user.collections.push(collection._id);
  await User.findByIdAndUpdate(req.user._id, _.omit(user, ["__v", "_id"]));
  await collectionSettings.save();
  await collectionData.save();
  await collectionModel.save();
  await collection.save();

  return res.status(201).send(collection);
});

module.exports = router;
