const express = require("express");
const validateObjID = require("../../middleware/validateObjID");
const auth = require("../../middleware/auth");
const { ActionToken } = require("../../models/actionToken");
const { Collection, validateCollectionShare } = require("../../models/collection");
const { User } = require("../../models/user");
const Joi = require("joi");
const router = express.Router();

/**
 * Share a collection to another Koishi user, or make it public 
 * and accesible to the others
 */

/** GET /tools/share/invites
 * Get all share invites
 */
router.get("/share/invites", [auth], async (req, res) => {
  const tokens = await ActionToken.find({
    userId: req.user._id,
    category: "share",
  });
  return res.status(200).send(tokens);
});

/** PUT /tools/share/accept/:token
 * Accept a share.
 * NOTE: When user accepts a share, the target collection will be added
 * to the list of collectinos for that user
 */
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

/** PUT /tools/share/decline/:token
 * Decline an invite for a collection share
 */
router.put("/share/decline/:token", [auth], async (req, res) => {
  // Remove the action token
  let token = await ActionToken.findByIdAndDelete(req.params.token);
  if (!token) return res.status(404).send("ActionToken not found.");

  return res.status(200).send("Collection share declined.");
});

/** PUT /tools/share/add/:id
 * Share a collection specified by it's id to another Koishi user
 */
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
  const targetUserId = (
    await User.findOne({ email: req.body.userEmail })
  ).toObject()._id;

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

/** PUT /tools/share/remove/:id/all
 * Cancel all shares for a collection specified by an id
 */
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

/** PUT /tools/share/remove/:id
 * Cancel sharing bond with a specified User (specified by an email in req.body)
 */
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

/** PUT /tools/visibility/public/:id
 * Make a collection public
 */
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

/** PUT /tools/visibility/private/:id
 * Make a collection private again
 */
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

module.exports = router;
