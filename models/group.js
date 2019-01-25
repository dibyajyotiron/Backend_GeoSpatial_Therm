const mongoose = require("mongoose"),
	Joi = require("joi"),
	{ userSchema, validUserSchema } = require("./project");

const groupSchema = new mongoose.Schema({
	uid: {
		type: String,
		required: true,
	},
	name: {
		type: String,
		required: true,
	},
	description: String,
	active: {
		type: Boolean,
		default: true,
	},
	owner: {
		type: { userSchema },
	},
	readUsers: [userSchema],
	writeUsers: [userSchema],
	organization: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Organization",
	},
});

function validate(group) {
	const schema = {
		uid: Joi.string().required(),
		name: Joi.string()
			.min(2)
			.max(50)
			.required(),
		description: Joi.string().allow("", null),
		readUsers: Joi.array().items(Joi.object(validUserSchema)),
		writeUsers: Joi.array().items(Joi.object(validUserSchema)),
	};
	return Joi.validate(group, schema);
}
// groupSchema.pre("save", function(next) {
// 	// this.owner = {
// 	// 	uid: req.user.uid,
// 	// 	email: req.user.email,
// 	// };
// 	console.log(this);
// 	next();
// });
module.exports.validateGroup = validate;
module.exports.Group = mongoose.model("Group", groupSchema);
