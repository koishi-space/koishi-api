const mongoose = require("mongoose");
const Joi = require("joi");

const collectionSettingsSchema = new mongoose.Schema({
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Collection",
  },
  barGraph: {
    xAxis: {
      dataKey: { type: String, default: "" },
      type: { type: String, default: "category" },
      hide: { type: Boolean, default: false },
      allowDecimals: { type: Boolean, default: true },
      allowDataOverflow: { type: Boolean, default: false },
      range: {
        from: { type: String, default: "auto" },
        fromCustom: { type: String, default: "" },
        to: { type: String, default: "auto" },
        toCustom: { type: String, default: "" },
      },
      label: { type: String, default: "" },
      unit: { type: String, default: "" },
      scale: { type: String, default: "auto" },
    },
    yAxis: {
      dataKey: { type: String, default: "" },
      type: { type: String, default: "number" },
      hide: { type: Boolean, default: false },
      allowDecimals: { type: Boolean, default: true },
      allowDataOverflow: { type: Boolean, default: false },
      range: {
        from: { type: String, default: "auto" },
        fromCustom: { type: String, default: "" },
        to: { type: String, default: "auto" },
        toCustom: { type: String, default: "" },
      },
      label: { type: String, default: "" },
      unit: { type: String, default: "" },
      scale: { type: String, default: "auto" },
    },
    bars: {
      type: [
        {
          dataKey: { type: String, default: "" },
          fill: { type: String, default: "#8884d8" },
          unit: { type: String, default: "" },
          name: { type: String, default: "" },
          stackId: { type: String, default: "" },
        },
      ],
      default: [],
    },
  },
});

function validateCollectionSettings(payload) {
  const axisSettingsSchema = Joi.object({
    dataKey: Joi.string().allow("").required(),
    type: Joi.string().allow("category", "number").required(),
    hide: Joi.boolean().required(),
    allowDecimals: Joi.boolean().required(),
    allowDataOverflow: Joi.boolean().required(),
    range: Joi.object({
      from: Joi.string().allow("auto", "dataMin", "dataMax", "custom").required(),
      fromCustom: Joi.string().allow("").required(),
      to: Joi.string().allow("auto", "dataMin", "dataMax", "custom").required(),
      toCustom: Joi.string().allow("").required(),
    }).required(),
    label: Joi.string().allow("").required(),
    unit: Joi.string().allow("").required(),
    scale: Joi.string().allow("auto", "linear", "pow", "sqrt", "log").required(),
  });

  const barSchema = Joi.object({
    dataKey: Joi.string().allow("").required(),
    fill: Joi.string().regex(/^#([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$/).required(),
    unit: Joi.string().allow("").required(),
    name: Joi.string().allow("").required(),
    stackId: Joi.string().allow("").required(),
  });

  const schema = Joi.object({
    _id: Joi.any(),
    __v: Joi.any(),
    parent: Joi.string()
      .regex(/^[0-9a-fA-F]{24}$/)
      .required(),
    barGraph: Joi.object({
      xAxis: axisSettingsSchema.required(),
      yAxis: axisSettingsSchema.required(),
      bars: Joi.array().items(barSchema),
    }).required(),
  });

  return schema.validate(payload);
}

const CollectionSettings = mongoose.model(
  "CollectionSettings",
  collectionSettingsSchema
);

module.exports.CollectionSettings = CollectionSettings;
module.exports.validateCollectionSettings = validateCollectionSettings;
