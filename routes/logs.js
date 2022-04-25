const express = require("express");
const admin = require("../middleware/admin");
const auth = require("../middleware/auth");
const { Log } = require("../models/log");
const router = express.Router();

/**
 * Endpoint to manage server logs
 */

/** POST /logs/invoke
 * Manually invoke a log message (throw an error)
 */
router.post("/invoke", [auth, admin], (req, res) => {
  throw new Error("Test error invoked.");
});

/** GET /logs
 * Get all server logs.
 * Return only error logs, unless specified otherwise by the "level" 
 * query parameter set to "all"
 */
router.get("/", [auth, admin], async (req, res) => {
  let options = {};
  if (req.query.level !== "all") {
    let level = req.query.level || "error";
    options.level = level;
  }
  let logs = await Log.find(options).sort({ timestamp: "desc" });
  res.status(200).send(logs);
});

/** GET /logs/:id
 * Get a detail of a specific server log
 */
router.get("/:id", [auth, admin], async (req, res) => {
  let log = await Log.findById(req.params.id);
  res.status(200).send(log);
});

/** DELETE /logs
 * Clear all server logs
 */
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
