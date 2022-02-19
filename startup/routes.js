const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");

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
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  
  // Middleware that is only active in production environment
  // Morgan - request logs
  // Helmet - route protection
  app.use(morgan("tiny"));
  if (process.env.NODE_ENV === "development") app.use(helmet());

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
