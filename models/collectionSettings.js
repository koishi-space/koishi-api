const mongoose = require("mongoose");
const Joi = require("joi");

/**
 * A definition of parameters that are used on the Koishi WEB by Recharts
 * to render graphs.
 */

// MongoDB table schema
const collectionSettingsSchema = new mongoose.Schema({
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Collection",
  },
  name: { type: String, default: "New settings" },
  composedGraph: {
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
          hide: { type: Boolean, default: false },
        },
      ],
      default: [],
    },
    lines: {
      type: [
        {
          dataKey: { type: String, default: "" },
          lineType: { type: String, default: "linear" },
          stroke: { type: String, default: "#7bed55" },
          dot: { type: Boolean, default: true },
          activeDot: { type: Boolean, default: true },
          label: { type: Boolean, default: false },
          strokeWidth: { type: Number, default: 1 },
          connectNulls: { type: Boolean, default: false },
          unit: { type: String, default: "" },
          name: { type: String, default: "" },
          hide: { type: Boolean, default: false },
        },
      ],
      default: [],
    },
    areas: {
      type: [
        {
          dataKey: { type: String, default: "" },
          lineType: { type: String, default: "linear" },
          stroke: { type: String, default: "#7bed55" },
          dot: { type: Boolean, default: false },
          activeDot: { type: Boolean, default: false },
          label: { type: Boolean, default: false },
          connectNulls: { type: Boolean, default: false },
          unit: { type: String, default: "" },
          name: { type: String, default: "" },
          stackId: { type: String, default: "" },
          hide: { type: Boolean, default: false },
        },
      ],
      default: [],
    },
  },
  radarGraph: {
    polarAngleAxis: {
      dataKey: { type: String, default: "" },
    },
    radialAngleAxis: {
      dataKey: { type: String, default: "" },
      range: {
        from: { type: String, default: "auto" },
        fromCustom: { type: String, default: "" },
        to: { type: String, default: "auto" },
        toCustom: { type: String, default: "" },
      },
    },
    radars: {
      type: [
        {
          dataKey: { type: String, default: "" },
          name: { type: String, default: "" },
          fill: { type: String, default: "#ad37e8" },
          dot: { type: Boolean, default: false },
          activeDot: { type: Boolean, default: false },
          label: { type: Boolean, default: false },
          hide: { type: Boolean, default: false },
        },
      ],
      default: [],
    },
  },
  pieGraph: {
    dataKey: { type: String, default: "" },
    nameKey: { type: String, default: "" },
    fill: { type: String, default: "#946d90" },
  },
});

/**
 * Validate the whole CollectionSettings object
 * @param {Object} payload The payload to validate
 * @returns {ValidationError?} If the payload is invalid, returns the error object
 */
function validateCollectionSettings(payload) {
  const axisSettingsSchema = Joi.object({
    dataKey: Joi.string().allow("").required(),
    type: Joi.string().allow("category", "number").required(),
    hide: Joi.boolean().required(),
    allowDecimals: Joi.boolean().required(),
    allowDataOverflow: Joi.boolean().required(),
    range: Joi.object({
      from: Joi.string()
        .allow("auto", "dataMin", "dataMax", "custom")
        .required(),
      fromCustom: Joi.string().allow("").required(),
      to: Joi.string().allow("auto", "dataMin", "dataMax", "custom").required(),
      toCustom: Joi.string().allow("").required(),
    }).required(),
    label: Joi.string().allow("").required(),
    unit: Joi.string().allow("").required(),
    scale: Joi.string()
      .allow("auto", "linear", "pow", "sqrt", "log")
      .required(),
  });

  const barSchema = Joi.object({
    _id: Joi.any(),
    __v: Joi.any(),
    dataKey: Joi.string().allow("").required(),
    fill: Joi.string()
      .regex(/^#([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$/)
      .required(),
    unit: Joi.string().allow("").required(),
    name: Joi.string().allow("").required(),
    stackId: Joi.string().allow("").required(),
    hide: Joi.boolean().required(),
  });

  const lineSchema = Joi.object({
    _id: Joi.any(),
    __v: Joi.any(),
    dataKey: Joi.string().allow("").required(),
    lineType: Joi.string()
      .allow(
        "basis",
        "basisClosed",
        "basisOpen",
        "linear",
        "linearClosed",
        "natural",
        "monotone",
        "monotoneX",
        "monotoneY",
        "step",
        "stepBefore",
        "stepAfter"
      )
      .required(),
    stroke: Joi.string()
      .regex(/^#([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$/)
      .required(),
    dot: Joi.boolean().required(),
    activeDot: Joi.boolean().required(),
    label: Joi.boolean().required(),
    strokeWidth: Joi.number().min(1).max(20).required(),
    connectNulls: Joi.boolean().required(),
    unit: Joi.string().allow("").required(),
    name: Joi.string().allow("").required(),
    hide: Joi.boolean().required(),
  });

  const areaSchema = Joi.object({
    _id: Joi.any(),
    __v: Joi.any(),
    dataKey: Joi.string().allow("").required(),
    lineType: Joi.string()
      .allow(
        "basis",
        "basisClosed",
        "basisOpen",
        "linear",
        "linearClosed",
        "natural",
        "monotone",
        "monotoneX",
        "monotoneY",
        "step",
        "stepBefore",
        "stepAfter"
      )
      .required(),
    stroke: Joi.string()
      .regex(/^#([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$/)
      .allow("")
      .required(),
    dot: Joi.boolean().required(),
    activeDot: Joi.boolean().required(),
    label: Joi.boolean().required(),
    connectNulls: Joi.boolean().required(),
    unit: Joi.string().allow("").required(),
    name: Joi.string().allow("").required(),
    stackId: Joi.string().allow("").required(),
    hide: Joi.boolean().required(),
  });

  const polarAngleAxisSchema = Joi.object({
    dataKey: Joi.string().allow("").required(),
  });

  const radialAngleAxisSchema = Joi.object({
    dataKey: Joi.string().allow("").required(),
    range: Joi.object({
      from: Joi.string()
        .allow("auto", "dataMin", "dataMax", "custom")
        .required(),
      fromCustom: Joi.string().allow("").required(),
      to: Joi.string().allow("auto", "dataMin", "dataMax", "custom").required(),
      toCustom: Joi.string().allow("").required(),
    }).required(),
  });

  const radarSchema = Joi.object({
    _id: Joi.any(),
    __v: Joi.any(),
    dataKey: Joi.string().allow("").required(),
    name: Joi.string().allow("").required(),
    fill: Joi.string()
      .regex(/^#([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$/)
      .allow("")
      .required(),
    dot: Joi.boolean().required(),
    activeDot: Joi.boolean().required(),
    label: Joi.boolean().required(),
    hide: Joi.boolean().required(),
  });

  const pieSchema = Joi.object({
    dataKey: Joi.string().allow("").required(),
    nameKey: Joi.string().allow("").required(),
    fill: Joi.string()
      .regex(/^#([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$/)
      .required(),
  });

  const schema = Joi.object({
    _id: Joi.any(),
    __v: Joi.any(),
    parent: Joi.string()
      .regex(/^[0-9a-fA-F]{24}$/)
      .required(),
    name: Joi.string().max(30).required(),
    composedGraph: Joi.object({
      xAxis: axisSettingsSchema.required(),
      yAxis: axisSettingsSchema.required(),
      bars: Joi.array().items(barSchema),
      lines: Joi.array().items(lineSchema),
      areas: Joi.array().items(areaSchema),
    }).required(),
    radarGraph: Joi.object({
      polarAngleAxis: polarAngleAxisSchema.required(),
      radialAngleAxis: radialAngleAxisSchema.required(),
      radars: Joi.array().items(radarSchema),
    }).required(),
    pieGraph: pieSchema.required(),
  });

  return schema.validate(payload);
}

// Create a mongoose model
const CollectionSettings = mongoose.model(
  "CollectionSettings",
  collectionSettingsSchema
);

module.exports = {
  CollectionSettings,
  validateCollectionSettings,
};
