const mongoose = require("mongoose");
const Joi = require("joi");

const collectionSchema = new mongoose.Schema({
  title: String,
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    tef: "User",
  },
  model: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CollectionModel",
  },
  data: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CollectionData",
  },
});

function validateCollection(payload) {
  const schema = Joi.object({
    _id: Joi.any(),
    __v: Joi.any(),
    title: Joi.string().required(),
    owner: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    model: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    data: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
  });

  return schema.validate(payload);
}

const Collection = mongoose.model("Collection", collectionSchema);

module.exports.Collection = Collection;
module.exports.validateCollection = validateCollection;
