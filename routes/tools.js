const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const fs = require("fs");
const path = require("path");
const validateObjID = require("../middleware/validateObjID");
const { Collection, validateCollectionShare, getUserByEmail } = require("../models/collection");
const { CollectionData } = require("../models/collectionData");
const { CollectionSettings } = require("../models/collectionSettings");
const { User } = require("../models/user");
const winston = require("winston");
const { ActionToken } = require("../models/actionToken");
const Joi = require("joi");
const o2x = require("object-to-xml");
const xlsx = require("xlsx");
const { validateCollectionModel, CollectionModel } = require("../models/collectionModel");
const _ = require("lodash");

router.get("/export/:id/json", [validateObjID, auth], async (req, res) => {
  // Check ownership
  const userId = req.user._id;
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

  // Parse to a simplified json structure
  let contents = simplifyCollectionStruct(collectionData.value);

  // Create a temporary file and send it to the client
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

router.get("/export/:id/xml", [validateObjID, auth], async (req, res) => {
  // Check ownership
  const userId = req.user._id;
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

  // Parse to a simplified json structure
  let contents = simplifyCollectionStruct(collectionData.value);

  // Create a temporary file
  let dir = path.join(
    __dirname,
    "..",
    "temp",
    "xmlexports",
    `${getRandomFilename()}.xml`
  );

  // Parse to XML
  var xml = o2x({
    '?xml version="1.0" encoding="UTF-8"?': null,
  });
  xml += "<root>"
  for (let row of contents) {
    let rowParsed = {};
    for (let key of Object.keys(row))
      rowParsed[key.replace(/\s/g, "_")] = row[key];
    xml += o2x({row: rowParsed});
  }
  xml += "</root>";

  // Send the file to client
  fs.writeFile(dir, xml, (err, file) => {
    if (err) return res.status(400).send(err);
    res.status(200).download(dir, collection.title.trim() + ".xml", (err) => {
      if (err) winston.error(err);
      fs.unlink(dir, (err) => {
        console.log(err);
      });
    });
  });
});

router.get("/export/:id/xlsx", [validateObjID, auth], async (req, res) => {
  // Check ownership
  const userId = req.user._id;
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

  // Parse to a simplified json structure
  let contents = simplifyCollectionStruct(collectionData.value);

  // Create a temporary file
  let dir = path.join(
    __dirname,
    "..",
    "temp",
    "xlsxexports",
    `${getRandomFilename()}.xlsx`
  );

  // Parse to XLSX
  const sheet = xlsx.utils.json_to_sheet(contents)
  const book = xlsx.utils.book_new()
  xlsx.utils.book_append_sheet(book, sheet, collection.title.trim() + ".xlsx");
  xlsx.writeFile(book, dir);
  
  // Send the file to client
  res.status(200).download(dir, collection.title.trim() + ".xlsx", (err) => {
    if (err) winston.error(err);
    fs.unlink(dir, (err) => {
      winston.error(err);
    });
  });
});

router.get("/share/invites", [auth], async (req, res) => {
  const tokens = await ActionToken.find({
    userId: req.user._id,
    category: "share",
  });
  return res.status(200).send(tokens);
});

router.put("/share/accept/:token", [auth], async (req, res) => {
  // Get the action token
  let token = await ActionToken.findById(req.params.token);
  if (!token) return res.status(404).send("ActionToken not found.");

  // Check if the shared collection exists
  const collection = await Collection.findById(token.targetId);
  if (!collection) return res.status(404).send("Collection does not exist.");

  // Add the collection to user's profile
  let user = await User.findById(req.user._id);
  if (!user.collections.includes(token.targetId)) {
    user.collections.push(token.targetId);
  }
  await User.findByIdAndUpdate(user._id, user);

  // Delete the action token
  await ActionToken.findByIdAndDelete(token._id);

  return res.status(200).send("Collection share accepted.");
});

router.put("/share/decline/:token", [auth], async (req, res) => {
  // Remove the action token
  let token = await ActionToken.findByIdAndDelete(req.params.token);
  if (!token) return res.status(404).send("ActionToken not found.");

  return res.status(200).send("Collection share declined.");
});

router.post("/share/add/:id", [validateObjID, auth], async (req, res) => {
  // Check ownership
  let collection = await Collection.findOne({
    owner: req.user._id,
    _id: req.params.id,
  });
  if (!collection) return res.status(404).send("Collection not found");

  // Validate share request payload
  const { error } = validateCollectionShare(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  // Add / update shares and save
  let shareIsUpdate;
  let shares = collection.sharedTo.filter(
    (x) => x.userEmail === req.body.userEmail
  );
  if (shares.length > 0) {
    // Already shared to this user - update the role
    shareIsUpdate = true;
    for (const i in collection.sharedTo) {
      if (collection.sharedTo[i].userEmail === req.body.userEmail)
        collection.sharedTo[i] = req.body;
    }
  } else {
    // First time sharing to this user
    shareIsUpdate = false;
    collection.sharedTo.push(req.body);
  }

  // Check if the share target user is registered on Koishi - if not, DO NOT let the user know for security reasons
  const targetUserId = await getUserIdByEmail(req.body.userEmail);

  if (targetUserId) {
    // If it is just a share role update, edit the user directly; if not, send an action token as a form of invite
    if (shareIsUpdate) {
      let user = await User.findById(targetUserId);
      if (!user.collections.includes(collection._id)) {
        // Update the action token
        await ActionToken.findOneAndUpdate(
          { userId: user._id, targetId: collection._id, category: "share" },
          {
            purpose: `User ${req.user.name} shared collection ${collection.title} with role ${req.body.role}`,
          }
        );
      }
      await User.findByIdAndUpdate(user._id, user);
    } else {
      // Create actionToken for the target share user
      let actionToken = new ActionToken({
        category: "share",
        purpose: `User ${req.user.name} shared collection ${collection.title} with role ${req.body.role}`,
        userId: targetUserId,
        targetId: collection._id,
      });
      await actionToken.save();
    }
    await Collection.findByIdAndUpdate(collection._id, collection);
  }

  res.status(200).send(`Collection shared.`);
});

router.put("/share/remove/:id/all", [auth], async (req, res) => {
  // Check ownership
  let collection = await Collection.findOne({
    owner: req.user._id,
    _id: req.params.id,
  });
  if (!collection) return res.status(404).send("Collection not found");

  // Remove the shared collection from user profiles
  for (const share of collection.sharedTo) {
    let user = await User.findOne({ email: share.userEmail });
    if (user.collections.length > 0)
      for (let c of user.collections) {
        if (c == collection._id) {
          let index = user.collections.indexOf(c);
          user.collections.splice(index, 1);
          break;
        }
      }
    await User.findByIdAndUpdate(user._id, user);
  }

  // Update shares inside the collection and save
  collection.sharedTo = [];
  await Collection.findByIdAndUpdate(collection._id, collection);

  // Remove unresolved action share tokens
  await ActionToken.deleteMany({ category: "share", targetId: collection._id });

  res.status(200).send(`Cancelled all shares`);
});

router.put("/share/remove/:id", [auth], async (req, res) => {
  // Check ownership
  let collection = await Collection.findOne({
    owner: req.user._id,
    _id: req.params.id,
  });
  if (!collection) return res.status(404).send("Collection not found");

  // Validate share request payload
  const { error } = Joi.object({
    userEmail: Joi.string().email().required(),
  }).validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  // Update shares and save
  let index;
  for (let c of collection.sharedTo) {
    if (c.userEmail === req.body.userEmail) {
      index = collection.sharedTo.indexOf(c);
      break;
    }
  }
  collection.sharedTo.splice(index, 1);
  await Collection.findByIdAndUpdate(collection._id, collection);

  // Remove the collection from user profile and the bonded Action Tokens
  let targetUser = await User.findOne({ email: req.body.userEmail });
  if (targetUser) {
    for (let c of targetUser.collections) {
      if (c == req.params.id) {
        let index = targetUser.collections.indexOf(c);
        targetUser.collections.splice(index, 1);
        break;
      }
    }
    await User.findByIdAndUpdate(targetUser._id, targetUser);
    await ActionToken.findOneAndDelete({
      userId: targetUser._id,
      targetId: collection._id,
      category: "share",
    });
  }

  res.status(200).send(`Stopped sharing with ${req.body.userEmail}`);
});

router.put("/visibility/public/:id", [auth], async (req, res) => {
  // Check ownership
  let collection = await Collection.findOne({
    owner: req.user._id,
    _id: req.params.id,
  });
  if (!collection) return res.status(404).send("Collection not found");

  // Change the collection visibility to "public"
  await Collection.findByIdAndUpdate(collection._id, { isPublic: true });
  return res.status(200).send(`Collection ${collection.title} is now public.`);
});

router.put("/visibility/private/:id", [auth], async (req, res) => {
  // Check ownership
  let collection = await Collection.findOne({
    owner: req.user._id,
    _id: req.params.id,
  });
  if (!collection) return res.status(404).send("Collection not found");

  // Change the collection visibility to "private"
  await Collection.findByIdAndUpdate(collection._id, { isPublic: false });
  return res.status(200).send(`Collection ${collection.title} is now private.`);
});

router.get("/empty/settings", [], async (req, res) => {
  let settings = new CollectionSettings();
  res.status(200).send(settings);
});

router.post("/realtime/save", [auth], async (req, res) => {
  // Check and set ownership
  let user = await getUserByEmail(req.user.email, false);
  if (!user) return res.status(400).send("Creator does not exist.");

  // Prepare the collection structure
  let collection = new Collection({
    title: req.body.title,
    owner: user._id,
  });

  // Create and set the supplied data record
  // Cast the data structure to fit the one needed in db
  let dataCasted = [];

  for (const row of req.body.sessionData) {
    let rowCasted = [];
    Object.keys(row).forEach(k => {
      rowCasted.push({
        column: k,
        data: row[k],
      });
    });
    dataCasted.push(rowCasted);
  }
  let collectionData = new CollectionData({
    parent: collection._id,
    value: dataCasted,
  });
  collection.data = collectionData._id;

  // Create and set collection model if it is valid
  let error = validateCollectionModel(req.body.model, true).error;
  if (error) return res.status(400).send(error.details[0].message);
  let collectionModel = new CollectionModel({
    parent: collection._id,
    value: req.body.model,
  });
  collection.model = collectionModel._id;

  // Save the existing graph settings as the default setting preset
  let collectionSettings = new CollectionSettings({...req.body.settings, parent: collection._id});
  let presets = [];
  presets.push(collectionSettings._id);
  collection.settings = presets;

  // Save the collection and its parts and add it to user's collections
  user.collections.push(collection._id);
  await User.findByIdAndUpdate(user._id, _.omit(user, ["__v", "_id"]));
  await collectionSettings.save();
  await collectionData.save();
  await collectionModel.save();
  await collection.save();

  return res.status(201).send(collection);
});

function simplifyCollectionStruct(payload) {
  let simplified = new Array();
  let newItem = {};
  for (let x of payload) {
    for (let y of x) {
      newItem[y.column.toLowerCase()] = y.data;
    }
    simplified.push(newItem);
    newItem = {};
  }
  return simplified;
}

function getRandomFilename() {
  return Math.floor(Math.random() * 1000000000);
}

async function getUserIdByEmail(email, idOnly = true) {
  let user = await User.findOne({
    email: email,
  });

  if (idOnly) return user ? user._id : null;
  else return user ? user : null;
}

module.exports = router;
