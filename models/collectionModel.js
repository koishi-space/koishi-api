const mongoose = require("mongoose");
const Joi = require("joi");

const collectionModelSchema = new mongoose.Schema({
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Collection",
  },
  value: [
    {
      columnName: String, // <- Hashed
      dataType: String, // <- text/number/date/time/bool
      unit: String,
    },
  ],
});

function validateCollectionModel(payload, validateValues) {
  const valueSchema = Joi.object({
    columnName: Joi.string().max(20).required(),
    dataType: Joi.string().valid("text", "number", "date", "time","bool").required(),
    unit: Joi.string().max(5),
  });
  let schema;

  if (validateValues) {
    schema = Joi.array().min(1).items(valueSchema).required();
  } else {
    schema = Joi.object({
      _id: Joi.any(),
      __v: Joi.any(),
      parent: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
      value: Joi.array().min(1).items(valueSchema).required(),
    });
  }

  return schema.validate(payload);
}

const CollectionModel = mongoose.model(
  "CollectionModel",
  collectionModelSchema
);

module.exports.CollectionModel = CollectionModel;
module.exports.validateCollectionModel = validateCollectionModel;
