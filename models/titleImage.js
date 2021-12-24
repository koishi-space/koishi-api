const mongoose = require("mongoose");
const Joi = require("joi");

const titleImageSchema = new mongoose.Schema({
    title: String,
    data: Buffer,
});

function validateTitleImage(payload) {
    const schema = Joi.object({
        _id: Joi.any(),
        __v: Joi.any(),
        title: Joi.string().max(20).required(),
        data: Joi.binary().max(5242880).required(),
    });

    return schema.validate(payload);
}


const TitleImage = mongoose.model("TitleImage", titleImageSchema);

module.exports.TitleImage = TitleImage;
module.exports.validateTitleImage = validateTitleImage;