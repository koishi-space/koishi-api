const mongoose = require("mongoose");
const Joi = require("joi").extend(require("@joi/date"));
const _ = require("lodash");

/**
 * An array of rows, representing all the data that is saved in a collection.
 */

// MongoDB db table schema
const collectionDataSchema = new mongoose.Schema({
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Collection",
  },
  value: [
    [
      {
        column: String,
        data: String,
      },
    ],
  ],
});

/**
 * Validate the whole CollectionData schema
 * @param {Object} payload The payload to validate
 * @returns {ValidationError?} If the payload is invalid, returns the error object
 */
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

/**
 * Validate if each column in a row is of a specified data type
 * @param {Object} collectionModel The definition of collection data structure
 * @param {Object} body the row (usually req.body)
 * @returns {string?} Validation error message if the validation resulted in "invalid"
 */
function validateRowPayload(collectionModel, body) {
  let fields = collectionModel.value;
  let validationErrorMessages = [];

  // For each field in a row
  for (const f of body) {
    // Find the corresponding column in a collection model
    // and check if the data types match
    let field = fields.find((x) => x.columnName === f.column);
    if (field) {
      let validator;
      if (field.dataType === "text") validator = Joi.string();
      else if (field.dataType === "number") validator = Joi.number();
      else if (field.dataType === "date") validator = Joi.date();
      else if (field.dataType === "time")
        validator = Joi.date().format("HH:mm").utc();
      else if (field.dataType === "bool") validator = Joi.boolean();
      if (validator) {
        const { error } = validator.validate(f.data);
        if (error) {
          validationErrorMessages.push(
            `${f.column} has to be "${field.dataType}"`
          );
        } else {
          _.remove(fields, (x) => x.columnName === field.columnName);
        }
      } else {
        validationErrorMessages.push(
          `Unsupported data type for ${field.columnName}`
        );
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

/**
 * Minimize the json structure of a colletion data
 * @param collection.data.value The value of CollectionData
 * @returns {Array<Object>} collection data - rows in a simplified structure
 */
function simplifyCollectionStruct(payload, noWhitespace = false) {
  let simplified = [];
  let newItem = {};
  for (let x of payload) {
    for (let y of x) {
      if (noWhitespace) newItem[y.column.trim().replace(/\s/g, "_")] = y.data;
      else newItem[y.column] = y.data;
    }
    simplified.push(newItem);
    newItem = {};
  }
  return simplified;
}

// Create a mongoose model
const CollectionData = mongoose.model("CollectionData", collectionDataSchema);

module.exports = {
  CollectionData,
  validateCollectionData,
  validateRowPayload,
  simplifyCollectionStruct,
};
