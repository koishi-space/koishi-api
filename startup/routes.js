const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");

// Routes
const auth = require("../routes/auth");
const users = require("../routes/users");
const logs = require("../routes/logs");
const ping = require("../routes/ping");
const collections = require("../routes/collections/collections");
const collectionData = require("../routes/collections/collectionData/collectionData");
const tools = require("../routes/tools");

const error = require("../middleware/error");

const CORS_CONFIG = {
  origin: "*",
};

module.exports = function (app) {
  
  // Middleware config
  app.use(cors(CORS_CONFIG));
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(morgan("tiny"));
  if (process.env.NODE_ENV === "production") app.use(helmet()); // Only active on production environment

  // Router
  app.use("/ping", ping);
  app.use("/auth", auth);
  app.use("/users", users);
  app.use("/logs", logs);
  app.use("/collections", collections);
  app.use("/collections", collectionData);
  app.use("/tools", tools);

  // Others
  app.use(error);
};
