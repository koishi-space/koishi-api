const express = require("express");
const auth = require("../../middleware/auth");
const admin = require("../../middleware/admin");
const { Collection } = require("../../models/collection");
const { CollectionData } = require("../../models/collectionData");
const { CollectionActions } = require("../../models/collectionActions");
const { CollectionModel } = require("../../models/collectionModel");
const router = express.Router();

/**
 * Run management procedures on the server
 */

/** PATCH "/tools/system/clean"
 * Clean the database (populate collections, remove orphaned objects etc.)
 */
router.patch("/clean", [auth, admin], async (req, res) => {
  let eventLogs = [];

  // Check if each collection has all its required properties
  let collections = await Collection.find();
  for (let collection of collections) {
    let update = collection.toObject();

    if (!collection.sharedTo) {
      update.sharedTo = [];
      eventLogs.push(`Create "sharedTo" in ${collection.title}`);
    }

    if (!collection.actions) {
      let collectionActions = new CollectionActions({
        parent: update._id,
        value: [],
      });
      collectionActions.save();
      update.actions = collectionActions._id;
      eventLogs.push(`Create "actions" in ${collection.title}`);
    }

    await Collection.findByIdAndUpdate(
      update._id,
      _.omit(update, ["_id", "__v"])
    );
  }

  // Remove orphaned collection children objects
  let collectionDataObjs = await CollectionData.find();
  for (let cd of collectionDataObjs) {
    let parent = await Collection.findById(cd.parent);
    if (!parent) {
      await CollectionData.findByIdAndDelete(cd._id);
      eventLogs.push(`Delete orphaned "CollectionData" for ${cd.parent}`);
    }
  }

  let collectionModelObjs = await CollectionModel.find();
  for (let cm of collectionModelObjs) {
    let parent = await Collection.findById(cm.parent);
    if (!parent) {
      await CollectionModel.findByIdAndDelete(cm._id);
      eventLogs.push(`Delete orphaned "CollectionModel" for ${cm.parent}`);
    }
  }

  let collectionActionsObjs = await CollectionActions.find();
  for (let ca of collectionActionsObjs) {
    let parent = await Collection.findById(ca.parent);
    if (!parent) {
      await CollectionActions.findByIdAndDelete(ca._id);
      eventLogs.push(`Delete orphaned "CollectionActions" for ${ca.parent}`);
    }
  }

  return res.status(200).send(eventLogs);
});

module.exports = router;
