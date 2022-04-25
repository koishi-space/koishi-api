const mongoose = require("mongoose");
const Joi = require("joi");
const { emailEventReport } = require("../services/emailConnector");
const { telegramEventReport } = require("../services/telegramConnector");

/**
 * CollectionActions are a set of rules that each new/edited row is
 * checked against, potentially raising an event that the user is then notified
 * about.
 */

// MongoDB table schema
const collectionActionsSchema = new mongoose.Schema({
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Collection",
  },
  connectors: {
    telegram: {
      chatId: {
        type: String,
        default: "",
      },
      botToken: {
        type: String,
        default: "",
      },
    },
    email: {
      host: {
        type: String,
        default: "",
      },
      user: {
        type: String,
        default: "",
      },
      password: {
        type: String,
        default: "",
      },
      recievers: {
        type: [String],
        default: [],
      },
    },
  },
  value: [
    {
      connector: String,
      column: String,
      operand: String,
      target: String,
    },
  ],
});

/**
 * Validate the CollectionActions runners - (rules that are checked for each time a
 * value is added/updated in the collection)
 * @param {Object} payload The action runner
 * @returns {ValidationError?} If the payload is invalid, returns the error object
 */
function validateActionRunners(payload) {
  const validationSchema = Joi.array().items(
    Joi.object({
      connector: Joi.string().allow("telegram", "email"),
      column: Joi.string().required(),
      operand: Joi.string().allow("equal", "=", "<", "<=", ">", ">="),
      target: Joi.any().required(),
      _id: Joi.any(),
    })
  );

  return validationSchema.validate(payload);
}

/**
 * Validate the connectors that are used to send a message each time
 * an action triggers an event
 * @param {Object} payload The action connectors
 * @returns {ValidationError?} If the payload is invalid, returns the error object
 */
function validateActionConnectors(payload) {
  const validationSchema = Joi.object({
    telegram: Joi.object({
      chatId: Joi.string(),
      botToken: Joi.string(),
    }),
    email: Joi.object({
      host: Joi.string(),
      user: Joi.string(),
      password: Joi.string(),
      recievers: Joi.array().items(Joi.string().email()),
    }),
  });

  return validationSchema.validate(payload);
}

/**
 * Run the user defined rules agains a supplied Collection Row, and
 * send messages notifying about events that the actions eventually
 * triggered
 * @param {Object} row The row to run action rules against
 * @param {String} collectionTitle The title of a target collection
 * @param {ObjectId} collectionId The ObjectID of a target collection
 */
collectionActionsSchema.methods.runActions = async function (
  row,
  collectionTitle,
  collectionId
) {
  // Run all actions
  for (let action of this.value) {
    // Find the target column for an action
    let targetColumn = row.find((c) => c.column === action.column);
    if (targetColumn) {
      console.log(targetColumn);
      // Perform a value check for the target column
      let triggered = _performCheck(
        targetColumn.data,
        action.operand,
        action.target
      );

      // If the check triggered an action, generate a message add the corresponding action event
      if (triggered) {
        // Report each of the triggered event
        let message = _generateReportMessage(
          action,
          targetColumn.data,
          collectionTitle
        );
        switch (action.connector) {
          case "email":
            await emailEventReport(
              this.connectors.email,
              message,
              collectionTitle,
              collectionId
            );
            break;
          case "telegram":
            await telegramEventReport(this.connectors.telegram, message);
            break;
        }
      }
    }
  }
};

/**
 * Test if the specified action connector is working by sending a test message
 * @param {String} connectorType The name of a connector to test
 * @return {string} Test result
 * @throws {Error} If the specified connector is unknown
 */
collectionActionsSchema.methods.testActionConnector = async function (
  connectorType,
  collectionId
) {
  switch (connectorType) {
    case "email":
      await emailEventReport(
        this.connectors.email,
        "Connector test - if you are reading this, that means that the connector is working",
        undefined,
        collectionId
      );
      return "Email connector test successful";
    case "telegram":
      await telegramEventReport(
        this.connectors.telegram,
        "Connector test - if you are reading this, that means that the connector is working"
      );
      return "Telegram connector test successful";
    default:
      return "Unknown connector type: " + connectorType;
  }
};

// Generate a report message for an event that was triggered by an action
function _generateReportMessage(action, actualValue, collectionTitle) {
  return `[ALERT] in "${collectionTitle}"::"${action.column}" >> ${actualValue} is ${action.operand} ${action.target}`;
}

// Apply the given rules
function _performCheck(actualValue, operand, targetValue) {
  // Sometimes, the values coming from MongoDB may be all strings, so
  // this converts them to floats just to be sure. Obviously that is not needed
  // when the operand is string equality
  if (operand !== "equal") {
    actualValue = parseFloat(actualValue);
    targetValue = parseFloat(targetValue);
  }

  switch (operand) {
    case "equal":
      return actualValue.toString() === targetValue.toString();
    case "=":
      return actualValue === targetValue;
    case "<":
      return actualValue < targetValue;
    case "<=":
      return actualValue <= targetValue;
    case ">":
      return actualValue > targetValue;
    case ">=":
      return actualValue >= targetValue;
    default:
      throw new Error("Unsupported action operand: " + operand);
  }
}

// Create a mongoose model
const CollectionActions = mongoose.model(
  "CollectionActions",
  collectionActionsSchema
);

module.exports = {
  CollectionActions,
  validateActionRunners,
  validateActionConnectors,
};
