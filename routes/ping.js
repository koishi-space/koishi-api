const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const validateObjID = require("../middleware/validateObjID");

/**
 * Test the server status and functionality
 */

/** GET /ping
 * Get the server status
 */
router.get("/", (req, res) => {
  res.status(200).send(`Running on ${process.env.NODE_ENV}`);
});

/** GET /ping/auth
 * Check if a provided auth token is valid
 */
router.get("/auth", [auth], (req, res) => {
  res.status(200).send(`Authenticated, running on ${process.env.NODE_ENV}`);
});

/** GET /ping/admin
 * Check if a provided admin token is valid
 */
router.get("/admin", [auth, admin], (req, res) => {
  res.status(200).send(`Authorized, running on ${process.env.NODE_ENV}`);
});

/** GET /ping/error
 * Manually invoke an error (to check the server error logging and reporting)
 */
router.get("/error", [auth, admin], (req, res) => {
  throw new Error("Manually invoked test error");
  res.status(200).send("Well, this will never happen...");
});

/** GET /ping/:id
 * Check if a provided id is a valid MongoDB ObjectId
 */
router.get("/:id", [validateObjID], (req, res) => {
  res.status(200).send(`The given id is valid.`);
});

module.exports = router;
