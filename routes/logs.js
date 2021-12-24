const express = require("express");
const admin = require("../middleware/admin");
const auth = require("../middleware/auth");
const { Log } = require("../models/log");

const router = express.Router();

router.post("/invoke", [auth, admin], (req, res) => {
  throw new Error("Test error invoked.");
});

router.get("/", [auth, admin], async (req, res) => {
  let options = {};
  if (req.query.level !== "all") {
    let level = req.query.level || "error";
    options.level = level;
  }
  let logs = await Log.find(options).sort({ timestamp: "desc" });
  res.status(200).send(logs);
});

router.get("/:id", [auth, admin], async (req, res) => {
  let log = await Log.findById(req.params.id);
  res.status(200).send(log);
});

router.delete("/", [auth, admin], async (req, res) => {
  let options = {};
  if (req.query.level !== "all") {
    let level = req.query.level || "error";
    options.level = level;
  }
  await Log.deleteMany(options);
  res.status(200).send([]);
});

module.exports = router;
