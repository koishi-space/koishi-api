const mongoose = require("mongoose");

const logSchema = new mongoose.Schema({
  timestamp: Date,
  level: String,
  message: String,
  meta: {
    reason: {
      String,
    },
  },
});

const Log = mongoose.model("Log", logSchema);

module.exports.Log = Log;
