const express = require("express");
const cors = require("cors");
let morgan;

if (process.env.NODE_ENV !== "production")
  morgan = require("morgan");

// Routes
const auth = require("../routes/auth");
const users = require("../routes/users");
const logs = require("../routes/logs");
const ping = require("../routes/ping");
const collections = require("../routes/collections");
const tools = require("../routes/tools");

const error = require("../middleware/error");

const CORS_CONFIG = {
  origin: "*",
};

module.exports = function (app) {
  // Middleware config
  app.use(cors(CORS_CONFIG));
  app.use(express.urlencoded({extended: true}));
  app.use(express.json());
  
  if (process.env.NODE_ENV !== "production")
    app.use(morgan("tiny"));
  
  // Router
  app.use("/ping", ping);
  app.use("/auth", auth);
  app.use("/users", users);
  app.use("/logs", logs);
  app.use("/collections", collections);
  app.use("/tools", tools);

  // Others
  app.use(error);
};