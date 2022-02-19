const mongoose = require("mongoose");
const Joi = require("joi");

const actionTokenSchema = new mongoose.Schema({
    category: String,
    purpose: String, // <- a string explaining what the action token is meant for
    userId: mongoose.Schema.Types.ObjectId,
    targetId: mongoose.Schema.Types.ObjectId,
});

function validateActionToken(payload) {
    const schema = Joi.object({
        _id: Joi.any(),
        __v: Joi.any(),
        category: Joi.string().allow("share"),
        purpose: Joi.string().required(),
        userId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
        targetId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    });

    return schema.validate(payload);
}

const ActionToken = mongoose.model("ActionToken", actionTokenSchema);

module.exports.ActionToken = ActionToken;
module.exports.validateActionToken = validateActionToken;