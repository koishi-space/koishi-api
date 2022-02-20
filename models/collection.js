const mongoose = require("mongoose");
const Joi = require("joi");

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
    }
  ],
  model: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CollectionModel",
  },
  data: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CollectionData",
  },
  settings: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CollectionSettings",
    },
  ],
});

const collectionShareItemSchema = Joi.object({
  userEmail: Joi.string().email().required(),
  role: Joi.string().allow("view", "edit"),
});

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
    settings: Joi.array()
      .items(Joi.string().regex(/^[0-9a-fA-F]{24}$/))
      .required(),
  });

  return schema.validate(payload);
}

function validateCollectionShare(payload) {
  return collectionShareItemSchema.validate(payload);
}

function checkEditPermissions(collection, user) {
  // User is the collection's owner
  if (collection.owner.toString() === user._id.toString()) return true;

  // User has the collection shared to him
  const share = collection.sharedTo.find((x) => x.userEmail === user.email);
  return share && share.role === "edit";
}

async function getCollection(collectionId, user, populate = false) {
  let collection;
  if (populate)
    collection = await Collection.findOne({
      _id: collectionId,
      $or: [{ owner: user._id }, { "sharedTo.userEmail": user.email }],
    })
      .populate("model")
      .populate("data")
      .populate("settings");
  else
    collection = await Collection.findOne({
      _id: collectionId,
      $or: [{ owner: user._id }, { "sharedTo.userEmail": user.email }],
    });
  return collection;
}

async function getUserByEmail(email, idOnly = true) {
  let user = await User.findOne({
    email: email,
  });

  if (idOnly) return user ? user._id : null;
  else return user ? user : null;
}

const Collection = mongoose.model("Collection", collectionSchema);

module.exports.Collection = Collection;
module.exports.validateCollection = validateCollection;
module.exports.validateCollectionShare = validateCollectionShare;
module.exports.checkEditPermissions = checkEditPermissions;
module.exports.getCollection = getCollection;
module.exports.getUserByEmail = getUserByEmail;
