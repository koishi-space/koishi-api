const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { User } = require("../models/user");
const jwt_decode = require("jwt-decode");
const { Table } = require("../models/table");
const { tableModelValueJoiSchema } = require("../models/tableModelValue");
const Joi = require("joi");
const { update } = require("lodash");
const validateObjID = require("../middleware/validateObjID");

// Alter table structure
router.post("/:id", [auth, validateObjID], async (req, res) => {
  // Joi validation
  let joiSchema = Joi.array().items(tableModelValueJoiSchema);
  let { error } = joiSchema.validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  // Get table object
  let table = await Table.findById(req.params.id);
  if (!table) return res.status(404).send("Table not found.");

  // Check ownership
  let ownerId = await getUserIdFromToken(req.headers["x-auth-token"]);
  if (table.ownerId != ownerId)
    return res.status(400).send("Table does not belong to authenticated user.");

  // Alter table
  for (update of req.body) table.dataModel.push(update);

  res.send(table);
});

async function getUserIdFromToken(token) {
  let user = await User.findOne({
    email: jwt_decode(token).email,
  });
  return user._id;
}

module.exports = router;