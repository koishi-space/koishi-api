const helmet = require("helmet");
const compression = require("compression");

/**
 * Include packages specific for a production environment
 * @param {Object} app The core express.js app instance
 * @returns {void}
 */
module.exports = function(app) {
    app.use(helmet());
    app.use(compression());
}