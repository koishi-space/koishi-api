const express = require("express");
const _ = require("lodash");
const Joi = require("joi");
const router = express.Router();
const auth = require("../../middleware/auth");
const validateObjID = require("../../middleware/validateObjID");
const { User } = require("../../models/user");
const {
  Collection,
  checkEditPermissions,
  getCollection,
  getUserByEmail,
} = require("../../models/collection");
const { CollectionData, validateRowPayload } = require("../../models/collectionData");
const { ActionToken } = require("../../models/actionToken");
const {
  CollectionModel,
  validateCollectionModel,
} = require("../../models/collectionModel");
const {
  CollectionSettings,
  validateCollectionSettings,
} = require("../../models/collectionSettings");

// ===Collections===
router.get("/public/:id", [validateObjID], async (req, res) => {
  let collection;
  try {
    collection = (
      await Collection.findOne({ _id: req.params.id, isPublic: true })
        .select("-sharedTo")
        .populate("model")
        .populate("settings")
        .populate("data")
    ).toObject();
  } catch (ex) {
    return res.status(404).send("Collection was not found");
  }

  // Change the owner string
  const owner = await User.findById(collection.owner);
  collection.owner = owner.name;

  return res.status(200).send(collection);
});

router.get("/public", [], async (req, res) => {
  // TODO: fix this extremely inefficient code below (this whole endpoint is shit)
  let collectionsQuery = await Collection.find({ isPublic: true }).select(
    "-sharedTo"
  );
  let collections = [];

  if (req.query.fetchOwners) {
    for (let collection of collectionsQuery) {
      let c = collection.toObject();
      let owner = await User.findById(c.owner);
      c.owner = owner.name;
      collections.push(c);
    }
  }

  res.status(200).send(collections);
});

router.get("/:id", [validateObjID, auth], async (req, res) => {
  let collection;
  if (req.query.noPopulate) {
    collection = (await getCollection(req.params.id, req.user)).toObject();
  } else {
    collection = (
      await getCollection(req.params.id, req.user, true)
    ).toObject();
  }

  if (!collection) return res.status(404).send("Collection not found.");

  // Change the "owner" value
  let user = await User.findById(collection.owner);
  collection.ownerString = `${user.name} (${
    user.email === req.user.email ? "you" : user.email
  })`;
  return res.status(200).send(collection);
});

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
  let user = await getUserByEmail(req.user.email, false);
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

router.put("/:id", [validateObjID, auth], async (req, res) => {
  // Validate PUT request payload (only editable field so far is "title")
  const { error } = Joi.object({
    title: Joi.string().max(30).required(),
  }).validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  // Find collection and check ownership
  let collection = await getCollection(req.params.id, req.user);
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
  let user = await getUserByEmail(req.user.email, false);
  let collection = await Collection.findOne({
    _id: req.params.id,
    owner: user._id,
  });
  if (!collection) return res.status(404).send("Collection not found.");

  if (!req.query.actionToken) {
    let deleteToken = new ActionToken({
      purpose: `Delete collection "${collection.title}"`,
      userId: user._id,
      targetId: collection._id,
    });
    await deleteToken.save();
    return res.status(202).send(deleteToken);
  } else {
    let deleteToken = await ActionToken.findOne({
      _id: req.query.actionToken,
      userId: user._id,
      targetId: collection._id,
    });
    if (!deleteToken)
      return res
        .status(404)
        .send("No valid token found to approve this action.");
    const index = user.collections.indexOf(collection._id);
    user.collections.splice(index, 1);
    await User.findByIdAndUpdate(user._id, user);
    await Collection.findByIdAndDelete(deleteToken.targetId);
    await CollectionModel.findOneAndDelete({ parent: deleteToken.targetId });
    await CollectionData.findOneAndDelete({ parent: deleteToken.targetId });
    await CollectionSettings.deleteMany({ parent: deleteToken.targetId });
    await ActionToken.findByIdAndDelete(deleteToken._id);
    return res.status(200).send("Collection deleted.");
  }
});

// ===CollectionModel===
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

// ===CollectionSettings===
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
