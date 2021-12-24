const _ = require("lodash");
const express = require("express");
const bcrypt = require("bcrypt");
const Joi = require("joi");
const { User } = require("../models/user");

// NOTE: "auth" endpoint serves just as JsonWebToken generator for valid users
// registering new users and user management is handled in "users" endpoint

const router = express.Router();

router.post("/", async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  // Find user
  let user = await User.findOne({ email: req.body.email });
  if (!user) return res.status(400).send("Wrong username or password.");

  // Validate password
  let validPassword = await bcrypt.compare(req.body.password, user.password);
  if (!validPassword)
    return res.status(400).send("Wrong username or password.");

  // User found, password is valid -> return token
  let token = user.generateAuthToken();
  res.status(200).send(token);
});

/**
 * Validation of user login credentials - login data structure different
 * from register data structure
 *
 * @param {object} req original req object
 * @return {boolean} true - login credentials are in correct data form
 * @return {boolean} false - login credentials are not correct data form
 */
function validate(req) {
  const schema = Joi.object({
    email: Joi.string().min(4).max(50).email().required(),
    password: Joi.string().min(8).max(255).required(),
  });

  return schema.validate(req);
}

module.exports = router;
