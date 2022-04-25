const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const edit = require("../../middleware/edit");
const view = require("../../middleware/view");
const validateObjID = require("../../middleware/validateObjID");
const { CollectionModel } = require("../../models/collectionModel");
const {
  CollectionActions,
  validateActionRunners,
  validateActionConnectors,
} = require("../../models/collectionActions");

/**
 * This endpoint handles everything regarding collection actions.
 * Collection actions are a set of rules that are run agains each new/edited
 * row in a collection. If any of those rules trigger an event, a message
 * describing the event is sent using a specified action connector (email or telegram)
 */

/** GET /collections/:id/actions/connectors/test
 * Check if the connector is working by sending a test message
 */
router.get(
  "/:id/actions/connectors/test",
  [validateObjID, auth, edit],
  async (req, res) => {
    // Find the target CollectionActions object
    const collectionActions = await CollectionActions.findOne({
      parent: req.params.id,
    });
    if (!collectionActions) return res.status(404).send("Not found");

    // Send the test message
    let testResult = await collectionActions.testActionConnector(
      req.query.connector,
      req.params.id
    );

    // Return the test result
    return res.status(200).send(testResult);
  }
);

/** GET /collections/:id/actions
 * Get the CollectionActions object
 */
router.get("/:id/actions", [validateObjID, auth, view], async (req, res) => {
  // Get the collection actions
  const collectionActions = await CollectionActions.findOne({
    parent: req.params.id,
  });
  if (!collectionActions) return res.status(404).send("Not found");

  return res.status(200).send(collectionActions);
});

/** PATCH /collections/:id/actions/runners
 * Edit the list of actions' rules/runners
 */
router.patch(
  "/:id/actions/runners",
  [validateObjID, auth, edit],
  async (req, res) => {
    // Validate the payload
    const { error } = validateActionRunners(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    // Validate the runners target columns - if they exist in the collection model
    let collectionModel = await CollectionModel.findOne({
      parent: req.params.id,
    });
    if (!collectionModel) return res.status(404).send("Collection not found");
    for (let runner of req.body) {
      let targetColumn = collectionModel.value.find(
        (c) => c.columnName === runner.column
      );
      if (!targetColumn)
        return res
          .status(400)
          .send(`Column "${runner.column}" not found in the collection model`);
    }

    // Save the modified collection actions
    let updated = await CollectionActions.findOneAndUpdate(
      { parent: req.params.id },
      { value: req.body },
      { new: true }
    );

    return res.status(200).send(updated);
  }
);

/** PATCH /collections/:id/actions/runners
 * Edit the action connectors
 */
router.patch(
  "/:id/actions/connectors",
  [validateObjID, auth, edit],
  async (req, res) => {
    // Validate the payload
    const { error } = validateActionConnectors(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    // Update the action connectors
    let updated = await CollectionActions.findOneAndUpdate(
      { parent: req.params.id },
      { connectors: req.body },
      { new: true }
    );
    if (!updated) return res.status(404).send("Collection not found");

    return res.status(200).send(updated);
  }
);

module.exports = router;
