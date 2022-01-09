const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const fs = require("fs");
const path = require("path");
const validateObjID = require("../middleware/validateObjID");
const { Collection } = require("../models/colection");
const { CollectionData } = require("../models/collectionData");
const { User } = require("../models/user");
const winston = require("winston");

router.get("/export/:id/json", [validateObjID, auth], async (req, res) => {
  // Check ownership
  const userId = await getUserIdByEmail(req.user.email);
  const collection = await Collection.findOne({
    owner: userId,
    _id: req.params.id,
  });
  if (!collection) return res.status(404).send("Collection not found");

  // Get collection data
  const collectionData = await CollectionData.findOne({
    parent: collection._id,
  });
  if (!collectionData) return res.status(404).send("Collection is empty.");

  // Parse to a simplified json structure if "simplified" argument is passed
  let contents = req.query.simplified
    ? simplifyCollectionStruct(collectionData.value)
    : collectionData.value;

  // Create a temporary file
  let dir = path.join(
    __dirname,
    "..",
    "temp",
    "jsonexports",
    `${getRandomFilename()}.json`
  );
  fs.writeFile(dir, JSON.stringify(contents, null, 2), (err, file) => {
    if (err) return res.status(400).send(err);
    res.status(200).download(dir, collection.title.trim() + ".json", (err) => {
      if (err) winston.error(err);
      fs.unlink(dir, (err) => {
        console.log(err);
      });
    });
  });
});

function simplifyCollectionStruct(payload) {
  let simplified = new Array();
  let newItem = {};
  for (let x of payload) {
    for (let y of x) {
      newItem[y.column] = y.data;
    }
    simplified.push(newItem);
    newItem = {};
  }
  return simplified;
}

function getRandomFilename() {
  return Math.floor(Math.random() * 1000000000);
}

async function getUserIdByEmail(email) {
  let user = await User.findOne({
    email: email,
  });

  return user ? user._id : null;
}

module.exports = router;
