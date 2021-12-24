const mongoose = require("mongoose");
const Joi = require("joi");

// Mongodb data schema
const tableDataValueSchema = new mongoose.Schema({
  columnName: String,
  value: String,
});

let tableDataValueJoiSchema = Joi.object({
  _id: Joi.any(),
  // tableId: Joi.string().pattern(/^[a-f\d]{24}$/i),
  columnName: Joi.string().required(),
  value: Joi.string().required(),
});

function validateTableDataValue(payload) {
  return tableDataValueJoiSchema.validate(payload);
}

const TableDataValue = mongoose.model("TableDataValue", tableDataValueSchema);

module.exports.tableDataValueJoiSchema = tableDataValueJoiSchema;
module.exports.TableDataValue = TableDataValue;
module.exports.validateTableDataValue = validateTableDataValue;
