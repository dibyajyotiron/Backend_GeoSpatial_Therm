const mongoose = require("mongoose"),
	Joi = require("joi");

const organizationSchema = new mongoose.Schema({
	uid: {
		type: String,
		required: true,
	},
	active: {
		type: Boolean,
		default: true,
	},
	name: {
		type: String,
		required: true,
	},
});

function validate(organization) {
	const schema = {
		uid: Joi.string().required(),
		name: Joi.string().required(),
	};
	return Joi.validate(organization, schema);
}

module.exports.validateOrganization = validate;
module.exports.Organization = mongoose.model(
	"Organization",
	organizationSchema,
);
