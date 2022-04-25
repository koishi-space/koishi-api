const mongoose = require("mongoose");

/**
 * A LOG object. These are used for errors, warnings and info messages
 */

// MongoDB table schema
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

// Create a mongoose model
const Log = mongoose.model("Log", logSchema);

module.exports = {
  Log,
};
