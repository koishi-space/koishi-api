const _ = require("lodash");
const bcrypt = require("bcrypt");
const express = require("express");
const Joi = require("joi");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const emailConnector = require("../services/emailConnector");
const { User, validateUser } = require("../models/user");
const { Collection } = require("../models/collection");
const config = require("config");
const router = express.Router();

/**
 * Users management route
 */

/** GET /users
 * List all registered users
 */
router.get("/", [auth, admin], async (req, res) => {
  let users = await User.find().sort("name");
  res.status(200).send(users);
});

/** GET /users/me
 * Get a user details
 */
router.get("/me", auth, async (req, res) => {
  let user = await User.findById(req.user._id).select("-password");
  if (!user) return res.status(404).send("User under given id was not found.");
  res.status(200).send(user);
});

/** GET /users/:id
 * Get info about a user specified by an id
 */
router.get("/:id", [auth, admin], async (req, res) => {
  let id = req.params.id;
  let user = await User.findById(id).select("-password");

  if (!user) return res.status(404).send("User was not found.");

  res.status(200).send(user);
});

/** POST /users
 * Register a new user
 */
router.post("/", async (req, res) => {
  // Validate credentials
  req.body = _.omit(req.body, ["_id", "__v"]);
  const { error } = validateUser(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  // Check if email doesnt already exist
  let email = await User.findOne({ email: req.body.email });
  if (email) return res.status(400).send("This email is already registered.");

  // If user is unique, create
  let user = new User(req.body);
  // Hash the password
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(user.password, salt);

  // By default, set the "admin" flag to false
  user.isAdmin = false;

  // Check if user verification is enabled
  if (config.get("use_email").toString() === "true") {
    // If email verification is enabled, set the status to "pending", ...
    user.status = "pending";

    // ...generate a verification token
    const genRanHex = (size) =>
      [...Array(size)]
        .map(() => Math.floor(Math.random() * 16).toString(16))
        .join("");
    user.verificationCode = genRanHex(32);

    // ...and send a verification email
    await emailConnector.sendAccountVerificationEmail(user);
  } else {
    // User verification is disabled
    user.status = "verified";
    user.verificationCode = "disabled";
  }

  // Save the registered user to database
  user = await user.save();

  // Generate auth token for the newly registered user, and return it
  let token = user.generateAuthToken();
  res.status(200).send(token);
});

/** POST /users/verify
 * Verify a user
 */
router.post("/verify", async (req, res) => {
  // Validate the verification code
  const { error } = Joi.object({
    verificationCode: Joi.string()
      .pattern(/^[0-9a-f]{32}$/)
      .required(),
  }).validate(req.body);
  if (error) return res.status(404).send("Invalid token.");

  // Get the corresponding user
  let dbUser = await User.findOne({
    verificationCode: req.body.verificationCode,
  });
  if (!dbUser) return res.status(400).send("Invalid token.");

  // Check if the user hasn't already been verified
  if (dbUser.status !== "pending")
    return res.status(400).send("User has already been verified.");

  // Verify the user
  dbUser.status = "verified";
  let verifiedUser = await User.findByIdAndUpdate(
    dbUser._id,
    _.omit(dbUser, ["_id", "__v", "verificationCode"]),
    { new: true }
  );

  // Return an updated auth token
  return res.status(200).send(verifiedUser.generateAuthToken());
});

/** PUT /users/populate
 * Populate a user with all it's collections (in case there was a fault in the database)
 */
router.put("/populate", [auth], async (req, res) => {
  let user = await User.findById(req.user._id);
  const collections = await Collection.find({ owner: user._id });
  for (const collection of collections) {
    if (!user.collections.includes(collection._id))
      user.collections.push(collection._id);
  }
  await User.findByIdAndUpdate(user._id, _.omit(user, ["__v", "_id"]));
  return res.status(200).send("Populated your collections.");
});

module.exports = router;
