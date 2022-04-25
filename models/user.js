const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const config = require("config");
const Joi = require("joi");

/**
 * Koishi user
 */

// MongoDB table schema
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  status: String,
  isAdmin: Boolean,
  verificationCode: String,
  collections: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Collections",
    },
  ],
});

/**
 * Encode a user info into a JWT token that is passed around in the
 * "x-auth-token" and used for authentication and authorization
 * @returns {string} The JWT token
 */
userSchema.methods.generateAuthToken = function () {
  const token = jwt.sign(
    {
      _id: this._id,
      name: this.name,
      email: this.email,
      status: this.status,
      isAdmin: this.isAdmin,
    },
    config.get("jwtpk")
  );

  return token;
};

/**
 * Validate a user object
 * @param {Object} user The user to validate
 * @returns {ValidationError?} If the payload is invalid, returns the error object
 */
function validateUser(user) {
  const schema = Joi.object({
    _id: Joi.any(),
    __v: Joi.any(),
    name: Joi.string().min(2).max(10).required(),
    email: Joi.string().min(5).max(50).email().required(),
    password: Joi.string().min(8).max(20).required(),
    status: Joi.string(),
    isAdmin: Joi.boolean(),
    verificationCode: Joi.string(),
  });

  return schema.validate(user);
}

// Create a mongoose model
const User = mongoose.model("User", userSchema);

module.exports = {
  User,
  validateUser,
};
