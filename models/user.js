const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const config = require("config");
const Joi = require("joi");

// Mongodb data schema
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  isAdmin: Boolean,
});

/**
 * JsonWebToken generation
 * contents:
 *  - _id (MongoDB ObjectId)
 *  - name (string)
 *  - isAdmin (boolean)
 *
 * @return {JsonWebToken}
 */
userSchema.methods.generateAuthToken = function () {
  const token = jwt.sign(
    {
      _id: this._id,
      name: this.name,
      email: this.email,
      isAdmin: this.isAdmin,
    },
    config.get("jwtpk")
  );

  return token;
};

/**
 * Joi validation for "user" data structure
 *  - NOTE: this function does not test if name or email is already registered
 *
 * @param {object} user tested user object
 * @return {boolean} true - object is valid
 * @return {boolean} false - object is invalid
 */
function validateUser(user) {
  const schema = Joi.object({
    _id: Joi.any(),
    __v: Joi.any(),
    name: Joi.string().min(2).max(10).required(),
    email: Joi.string().min(5).max(50).email().required(),
    password: Joi.string().min(8).max(20).required(),
    isAdmin: Joi.boolean(),
  });

  return schema.validate(user);
}

const User = mongoose.model("User", userSchema);

module.exports.User = User;
module.exports.validateUser = validateUser;
