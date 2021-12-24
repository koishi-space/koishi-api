const helmet = require("helmet");
const compression = require("compression");

module.exports = function(app) {
    console.log("Plugged on prod appuse");
    app.use(helmet());
    app.use(compression());
}