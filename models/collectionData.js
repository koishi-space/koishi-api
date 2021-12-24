const mongoose = require("mongoose");
const Joi = require("joi");

const collectionDataSchema = new mongoose.Schema({
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Collection",
  },
  value: [
    {
      column: String, // <- Hash, represents to which column this data cell belongs to
      data: String, // <- has to match the data type of its column
    },
  ],
});

function validateCollectionData(payload) {
  const valueSchema = Joi.object({
    column: Joi.string().max(20).required(),
    data: Joi.any().required(),
  });

  const schema = Joi.object({
    _id: Joi.any(),
    __v: Joi.any(),
    parent: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    value: Joi.array().items(valueSchema).required(),
  });

  return schema.validate(payload);
}

const CollectionData = mongoose.model("CollectionData", collectionDataSchema);

module.exports.CollectionData = CollectionData;
module.exports.validateCollectionData = validateCollectionData;
