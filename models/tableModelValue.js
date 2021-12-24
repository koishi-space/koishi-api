const mongoose = require("mongoose");
const Joi = require("joi");

// Mongodb data schema
const tableModelValueSchema = new mongoose.Schema({
  columnName: String,
  dataType: String,
});

let tableModelValueJoiSchema = Joi.object({
  _id: Joi.any(),
  columnName: Joi.string().required(),
  dataType: Joi.string().pattern(/^(string|number|datetime)$/).required(),
});

function validateTableModelValue(payload) {
  return tableModelValueJoiSchema.validate(payload);
}

const TableModelValue = mongoose.model("TableModelValue", tableModelValueSchema);

module.exports.tableModelValueJoiSchema = tableModelValueJoiSchema;
module.exports.TableModelValue = TableModelValue;
module.exports.validateTableModelValue = validateTableModelValue;
