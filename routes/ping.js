const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const validateObjID = require("../middleware/validateObjID");

router.get("/", (req, res) => {
  res.status(200).send(`Running on ${process.env.NODE_ENV}`);
});

router.get("/auth", [auth], (req, res) => {
  res.status(200).send(`Authenticated, running on ${process.env.NODE_ENV}`);
});

router.get("/admin", [auth, admin], (req, res) => {
  res.status(200).send(`Authorized, running on ${process.env.NODE_ENV}`);
});

router.get("/error", [auth, admin], (req, res) => {
  throw new Error("Manually invoked test error");
  res.status(200).send("Well, this should not happen...");
});

router.get("/:id", [validateObjID], (req, res) => {
  res.status(200).send(`The given id is valid.`);
});

module.exports = router;
