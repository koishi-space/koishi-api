const mongoose = require("mongoose");
const Joi = require("joi");
const { User } = require("./user");

/**
 * Collection - the core object in Koishi
 */

// Mongodb table schema
const collectionSchema = new mongoose.Schema({
  title: String,
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  isPublic: {
    type: Boolean,
    default: false,
  },
  sharedTo: [
    {
      userEmail: String,
      role: String,
    },
  ],
  model: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CollectionModel",
  },
  data: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CollectionData",
  },
  actions: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CollectionActions",
  },
  settings: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CollectionSettings",
    },
  ],
});

// Object containing info about each case that the collection
// has been shared with someone
const collectionShareItemSchema = Joi.object({
  userEmail: Joi.string().email().required(),
  role: Joi.string().allow("view", "edit"),
});

/**
 * Validate the collection share payload
 * @param {Object} payload
 * @returns {ValidationError?} If the payload is invalid, returns the error object
 */
function validateCollectionShare(payload) {
  return collectionShareItemSchema.validate(payload);
}

/**
 * Validate the Collection schema
 * @param {Object} payload The payload to validate
 * @returns {ValidationError?} If the payload is invalid, returns the error object
 */
function validateCollection(payload) {
  const schema = Joi.object({
    _id: Joi.any(),
    __v: Joi.any(),
    title: Joi.string().max(30).required(),
    owner: Joi.string()
      .regex(/^[0-9a-fA-F]{24}$/)
      .required(),
    isPublic: Joi.boolean().required(),
    sharedTo: Joi.array().items(collectionShareItemSchema),
    model: Joi.string()
      .regex(/^[0-9a-fA-F]{24}$/)
      .required(),
    data: Joi.string()
      .regex(/^[0-9a-fA-F]{24}$/)
      .required(),
    actions: Joi.string()
      .regex(/^[0-9a-fA-F]{24}$/)
      .required(),
    settings: Joi.array()
      .items(Joi.string().regex(/^[0-9a-fA-F]{24}$/))
      .required(),
  });

  return schema.validate(payload);
}

/**
 * Check if the supplied user has edit permissions for the specified collection
 * @param {Object} collection The collection to check permissions for
 * @param {Object} user The user trying to access the collection
 * @returns {boolean} True if the user has edit permissions for the specified collection
 */
function checkEditPermissions(collection, user) {
  // User is the collection's owner
  if (collection.owner.toString() === user._id.toString()) return true;

  // User has the collection shared to him
  const share = collection.sharedTo.find((x) => x.userEmail === user.email);
  return share && share.role === "edit";
}

/**
 * A general function for retrieving a collection under different circumstances
 * @param {ObjectId} collectionId The id of the collection to retrieve
 * @param {Object} user The user trying to access the collection
 * @param {boolean} populate=false Whether to populate the collection's fields
 * @returns {Object} The retrieved collection
 */
async function getCollection(collectionId, user, populate = false) {
  let collection;
  if (populate)
    collection = await Collection.findOne({
      _id: collectionId,
      $or: [{ owner: user._id }, { "sharedTo.userEmail": user.email }],
    })
      .populate("model")
      .populate("data")
      .populate("actions")
      .populate("settings");
  else
    collection = await Collection.findOne({
      _id: collectionId,
      $or: [{ owner: user._id }, { "sharedTo.userEmail": user.email }],
    });

  // If the user is a collection's owner or the collection is shared to him
  return collection;
}

// Create a mongoose model
const Collection = mongoose.model("Collection", collectionSchema);

module.exports = {
  Collection,
  validateCollection,
  validateCollectionShare,
  checkEditPermissions,
  getCollection,
};
