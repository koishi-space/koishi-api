const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("../openapi.json");
const auth = require("../routes/auth");
const users = require("../routes/users");
const logs = require("../routes/logs");
const ping = require("../routes/ping");
const collections = require("../routes/collections/collections");
const collectionData = require("../routes/collections/collectionData");
const collectionModel = require("../routes/collections/collectionModel");
const collectionSettings = require("../routes/collections/collectionSettings");
const collectionActions = require("../routes/collections/collectionActions");
const toolsExport = require("../routes/tools/export");
const toolsShare = require("../routes/tools/share");
const toolsSystem = require("../routes/tools/system");
const error = require("../middleware/error");
const CORS_CONFIG = {
  origin: "*",
};

/**
 * The core express.js router - setup routes and middleware
 * @param {Object} app The express.js app instance
 * @returns {void}
 */
module.exports = function (app) {
  // Middleware config
  app.use(cors(CORS_CONFIG));
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(morgan("tiny"));

  // Router
  app.use("/ping", ping);
  app.use("/auth", auth);
  app.use("/users", users);
  app.use("/logs", logs);
  app.use("/collections", collections);
  app.use("/collections", collectionData);
  app.use("/collections", collectionModel);
  app.use("/collections", collectionSettings);
  app.use("/collections", collectionActions);
  app.use("/tools", toolsExport);
  app.use("/tools", toolsShare);
  app.use("/tools/system", toolsSystem);

  // Others
  app.use(error);
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument)); // Swagger documentation
};
