const express = require("express");
const validateObjID = require("../../middleware/validateObjID");
const auth = require("../../middleware/auth");
const view = require("../../middleware/view");
const o2x = require("object-to-xml");
const xlsx = require("xlsx");
const path = require("path");
const fs = require("fs");
const winston = require("winston");
const {
  CollectionData,
  simplifyCollectionStruct,
} = require("../../models/collectionData");
const router = express.Router();

/**
 * Export the collection data in JSON, XML and XLSX formats
 */

/** GET /tools/export/:id/json
 * Export the collection data in JSON
 * (In a siplified key:value format)
 */
router.get(
  "/export/:id/json",
  [validateObjID, auth, view],
  async (req, res) => {
    // Get collection data
    const collectionData = await CollectionData.findOne({
      parent: req.collection._id,
    });
    if (!collectionData) return res.status(404).send("Collection is empty.");

    // Parse to a simplified json structure
    let contents = simplifyCollectionStruct(collectionData.value);

    // Create a temporary file and send it to the client
    let dir = path.join(
      __dirname,
      "..",
      "..",
      "temp",
      "jsonexports",
      `${getRandomFilename()}.json`
    );
    fs.writeFile(dir, JSON.stringify(contents, null, 2), (err, file) => {
      if (err) {
        res.status(400).send(err);
        throw err;
      }
      res
        .status(200)
        .download(dir, req.collection.title.trim() + ".json", (err) => {
          if (err) winston.error(err);
          fs.unlink(dir, (err) => {
            throw err;
          });
        });
    });
  }
);

/** GET /tools/export/:id/xml
 * Export the collection data in XML
 * (In a siplified key:value format)
 */
router.get("/export/:id/xml", [validateObjID, auth, view], async (req, res) => {
  // Get collection data
  const collectionData = await CollectionData.findOne({
    parent: req.collection._id,
  });
  if (!collectionData) return res.status(404).send("Collection is empty.");

  // Parse to a simplified json structure
  let contents = simplifyCollectionStruct(collectionData.value, true);

  // Create a temporary file
  let dir = path.join(
    __dirname,
    "..",
    "..",
    "temp",
    "xmlexports",
    `${getRandomFilename()}.xml`
  );

  // Parse to XML
  var xml = o2x({
    '?xml version="1.0" encoding="UTF-8"?': null,
  });
  xml += "<root>";
  for (let row of contents) xml += o2x({ row: row });
  // for (let row of contents) {
  //   let rowParsed = {};
  //   for (let key of Object.keys(row))
  //     rowParsed[key.replace(/\s/g, "_")] = row[key];
  //   xml += o2x({ row: rowParsed });
  // }
  xml += "</root>";

  // Send the file to client
  fs.writeFile(dir, xml, (err, file) => {
    if (err) {
      res.status(400).send(err);
      throw err;
    }
    res
      .status(200)
      .download(dir, req.collection.title.trim() + ".xml", (err) => {
        if (err) winston.error(err);
        fs.unlink(dir, (err) => {
          throw err;
        });
      });
  });
});

/** GET /tools/export/:id/xlsx
 * Export the collection data in XLSX (Excel spreadsheet)
 * (In a siplified key:value format)
 */
router.get(
  "/export/:id/xlsx",
  [validateObjID, auth, view],
  async (req, res) => {
    // Get collection data
    const collectionData = await CollectionData.findOne({
      parent: req.collection._id,
    });
    if (!collectionData) return res.status(404).send("Collection is empty.");

    // Parse to a simplified json structure
    let contents = simplifyCollectionStruct(collectionData.value);

    // Create a temporary file
    let dir = path.join(
      __dirname,
      "..",
      "..",
      "temp",
      "xlsxexports",
      `${getRandomFilename()}.xlsx`
    );

    // Parse to XLSX
    const sheet = xlsx.utils.json_to_sheet(contents);
    const book = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(
      book,
      sheet,
      req.collection.title.trim() + ".xlsx"
    );
    xlsx.writeFile(book, dir);

    // Send the file to client
    res
      .status(200)
      .download(dir, req.collection.title.trim() + ".xlsx", (err) => {
        if (err) winston.error(err);
        fs.unlink(dir, (err) => {
          winston.error(err);
        });
      });
  }
);

// Generate a random name for a temp file (when exporting a collection)
function getRandomFilename() {
  return Math.floor(Math.random() * 1000000000);
}

module.exports = router;
