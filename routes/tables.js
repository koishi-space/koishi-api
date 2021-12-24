const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { User } = require("../models/user");
const jwt_decode = require("jwt-decode");
const { Table, validateTable } = require("../models/table");
const { tableModelValueJoiSchema } = require("../models/tableModelValue");
const Joi = require("joi");
const { array } = require("joi");
const { tableDataValueJoiSchema } = require("../models/tableDataValue");
const tableModels = require("./tableModels");

router.use("/datamodel", tableModels);

// Create new empty table
router.post("/", [auth], async (req, res) => {
  // Joi validation
  let { error } = validateTable(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  // Set ownership
  req.body.ownerId = await getUserIdFromToken(req.headers["x-auth-token"]);

  // Remove additional parameters
  delete req.body._id;
  delete req.body.__v;
  req.body.data = [];
  req.body.dataModel = [];

  // Save to db
  let table = new Table(req.body);
  await table.save();
  return res.status(201).send(table);
});

async function getUserIdFromToken(token) {
  let user = await User.findOne({
    email: jwt_decode(token).email,
  });
  return user._id;
}

module.exports = router;
