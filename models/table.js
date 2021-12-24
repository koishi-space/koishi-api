const mongoose = require("mongoose");
const Joi = require("joi");
const { tableDataValueJoiSchema } = require("./tableDataValue");
const { tableModelValueJoiSchema } = require("./tableModelValue");

// Mongodb data schema
const tableSchema = new mongoose.Schema({
  ownerId: mongoose.Schema.Types.ObjectId,
  tableName: String,
  dataModel: [
    {
      columnName: String, // HASHED
      dataType: String, // string/number/date/time
    },
  ],
  data: [
    {
      columnName: String, // HASHED
      value: String, // HASHED
    },
  ],
});

function validateTable(payload) {
  const schema = Joi.object({
    _id: Joi.any(),
    __v: Joi.any(),
    ownerId: Joi.any(),
    tableName: Joi.string().required(),
    dataModel: Joi.array().items(tableModelValueJoiSchema).required(),
    data: Joi.array().items(tableDataValueJoiSchema).required(),
  });

  return schema.validate(payload);
}

const Table = mongoose.model("Table", tableSchema);

module.exports.Table = Table;
module.exports.validateTable = validateTable;
