const mongoose = require("mongoose");
const Joi = require("joi");

const collectionSchema = new mongoose.Schema({
  title: String,
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
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

function validateCollection(payload) {
  const schema = Joi.object({
    _id: Joi.any(),
    __v: Joi.any(),
    title: Joi.string().max(30).required(),
    owner: Joi.string()
      .regex(/^[0-9a-fA-F]{24}$/)
      .required(),
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

const Collection = mongoose.model("Collection", collectionSchema);

module.exports.Collection = Collection;
module.exports.validateCollection = validateCollection;
