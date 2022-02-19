const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const config = require("config");
const Joi = require("joi");

// Mongodb data schema
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

const User = mongoose.model("User", userSchema);

module.exports.User = User;
module.exports.validateUser = validateUser;
