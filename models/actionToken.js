const mongoose = require("mongoose");
const Joi = require("joi");

/**
 * Action token is used to confirm a user action that is irreversible and
 * potentially dangerous (for example deleting a collection)
 */

// Mongodb table schema
const actionTokenSchema = new mongoose.Schema({
  category: String,
  purpose: String, // <- a string explaining what the action token is meant for
  userId: mongoose.Schema.Types.ObjectId,
  targetId: mongoose.Schema.Types.ObjectId,
});

/**
 * Validate the ActionToken schema
 * @param {Object} payload The payload to validate
 * @returns {ValidationError?} If the payload is invalid, returns the error object
 */
function validateActionToken(payload) {
  const schema = Joi.object({
    _id: Joi.any(),
    __v: Joi.any(),
    category: Joi.string().allow("share", "delete"),
    purpose: Joi.string().required(),
    userId: Joi.string()
      .regex(/^[0-9a-fA-F]{24}$/)
      .required(),
    targetId: Joi.string()
      .regex(/^[0-9a-fA-F]{24}$/)
      .required(),
  });

  return schema.validate(payload);
}

// Create a mongoose model
const ActionToken = mongoose.model("ActionToken", actionTokenSchema);

module.exports = {
  ActionToken,
  validateActionToken,
};
