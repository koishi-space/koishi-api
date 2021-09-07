const _ = require("lodash");
const bcrypt = require("bcrypt");
const express = require("express");
const Joi = require("joi");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const { User, validateUser } = require("../models/user");
const validateObjID = require("../middleware/validateObjID");
const router = express.Router();

router.get("/", [auth, admin], async (req, res) => {
  let users = await User.find().sort("name");
  res.status(200).send(users);
});

router.get("/:id", [auth, admin], async (req, res) => {
  let id = req.params.id;
  let user = await User.findById(id).select("-password");

  if (!user) return res.status(404).send("User was not found.");

  res.status(200).send(user);
});

router.get("/me", auth, async (req, res) => {
  let user = await User.findById(req.user._id).select("-password");
  if (!user) return res.status(404).send("User under given id was not found.");
  res.status(200).send(user);
});

router.post("/", async (req, res) => {
  // Validate credentials
  req.body = _.omit(req.body, ["_id", "__v"]);
  const { error } = validateUser(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  // Check if email doesnt already exist
  let email = await User.findOne({email: req.body.email});
  if (email) return res.status(400).send("This email is already registered.");

  // If user is unique, create
  user = new User(req.body);
  // -> Hash password
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(user.password, salt);
  if (!user.isAdmin) user.isAdmin = false;
  user = await user.save(); // save user to database

  // generate token for newly registered user
  let token = user.generateAuthToken();
  user = _.pick(user, ["_id", "name", "email", "isAdmin"]);
  res.status(200).header("x-auth-token", token).send(user);
});

// FOR NOW DISABLED - needs security enhancement
// router.put("/:id", [auth, validateObjID], async (req, res) => {
//   let id = req.params.id;
//   const {error} = validateUserForUpdate(req.body);
//   if (!await User.findById(id)) return res.status(404).send("User was not found.");
//   if (await checkIfDuplicite("email", req.body)) return res.status(400).send("This email is already registered.");
//   if (error) return res.status(400).send(error.details[0].message);
  
//   user = await User.findByIdAndUpdate(
//     id,
//     _.omit(req.body, ["_id", "__v"]),
//     {new: true}
//   ).select("-password");
//   res.status(202).send(user);
// });

// FOR NOW DISABLED - needs security enhancement
// router.delete("/:id", [auth, admin, validateObjID], async (req, res) => {
//   let user = await User.findByIdAndDelete(req.params.id);
//   if (!user) return res.status(404).send("User under given id was not found.");
//   res.status(202).send(user);
// });

async function checkIfDuplicite(key, payload) {
  let user = await User.findOne({ [key]: payload[key] });
  if (user && user._id != payload._id) return true;
  return false;
}

function validateUserForUpdate(user) {
  const schema = Joi.object({
    _id: Joi.any(),
    __v: Joi.any(),
    name: Joi.string().min(2).max(20).required(),
    email: Joi.string().min(5).max(50).email().required(),
  });

  return schema.validate(user);
}

module.exports = router;
