const mongoose = require("mongoose");
const Joi = require("joi").extend(require('@joi/date'));
const _ = require("lodash");

const collectionDataSchema = new mongoose.Schema({
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Collection",
  },
  value: [
    [
      {
        column: String, // <- Hash, represents to which column this data cell belongs to
        data: String, // <- has to match the data type of its column
      },
    ]
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

function validateRowPayload(collectionModel, body) {
  let fields = collectionModel.value;
  let validationErrorMessages = [];
  for (const f of body) {
    let field = fields.find((x) => x.columnName === f.column);
    if (field) {
      let validator;
      if (field.dataType === "text") validator = Joi.string();
      else if (field.dataType === "number") validator = Joi.number();
      else if (field.dataType === "date") validator = Joi.date();
      else if (field.dataType === "time") validator = Joi.date().format("HH:mm").utc();
      else if (field.dataType === "bool") validator = Joi.boolean();
      if (validator) {
        const { error } = validator.validate(f.data);
        if (error) {
          validationErrorMessages.push(`${f.column} has to be "${field.dataType}"`);
          // break;
        } else {
          _.remove(fields, (x) => x.columnName === field.columnName);
        }
      } else {
        validationErrorMessages.push(
          `Unsupported data type for ${field.columnName}`
        );
        // break;
      }
    } else {
      validationErrorMessages.push(`${f.column} is not allowed`);
    }
  }
  if (fields.length > 0) {
    for (const f of fields) {
      validationErrorMessages.push(`${f.columnName} is missing or not valid`);
    }
  }
  return validationErrorMessages;
}

const CollectionData = mongoose.model("CollectionData", collectionDataSchema);

module.exports.CollectionData = CollectionData;
module.exports.validateCollectionData = validateCollectionData;
module.exports.validateRowPayload = validateRowPayload;
