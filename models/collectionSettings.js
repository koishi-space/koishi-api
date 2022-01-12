const mongoose = require("mongoose");
const Joi = require("joi");

const collectionSettingsSchema = new mongoose.Schema({
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Collection",
  },
  lineGraph: [
      {
        column: String,
        axis: String,
        color: String,
      },
  ],
});

function validateCollectionSettings(payload) {
  const lineGraphSettingsSchema = Joi.object({
    column: Joi.string().max(20).required(),
    data: Joi.any().required(),
  });

  const schema = Joi.object({
    _id: Joi.any(),
    __v: Joi.any(),
    parent: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    lineGraph: Joi.array().items(settingsSchema).required(),
  });

  return schema.validate(payload);
}

const CollectionSettings = mongoose.model("CollectionSettings", collectionSettingsSchema);

module.exports.CollectionSettings = CollectionSettings;
module.exports.validateCollectionSettings = validateCollectionSettings;
