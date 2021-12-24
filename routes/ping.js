const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

router.get("/", (req, res) => {
  res.status(200).send(`Running on ${process.env.NODE_ENV}`);
});

router.get("/auth", [auth], (req, res) => {
  res.status(200).send(`Authenticated, running on ${process.env.NODE_ENV}`);
});

router.get("/admin", [auth, admin], (req, res) => {
  res.status(200).send(`Authorized, running on ${process.env.NODE_ENV}`);
});

module.exports = router;
