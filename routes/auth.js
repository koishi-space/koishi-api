const _ = require("lodash");
const express = require("express");
const bcrypt = require("bcrypt");
const Joi = require("joi");
const { User } = require("../models/user");
const router = express.Router();

/**
 * Generate JWT tokens for users to verify themself
 * NOTE: "auth" endpoint serves just as JsonWebToken generator for valid users
 * registering new users and user management is handled in "users" endpoint
 */

/** POST /auth
 * Authenticate a user and return a JWT token
 */
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
 * Validation of user login credentials - login data structure is different
 * from register data structure
 * @param {object} req The original request object
 * @return {?ValidationError} Return validation error if user login credentials are invalid
 */
function validate(req) {
  const schema = Joi.object({
    email: Joi.string().min(4).max(50).email().required(),
    password: Joi.string().min(8).max(255).required(),
  });

  return schema.validate(req);
}

module.exports = router;
