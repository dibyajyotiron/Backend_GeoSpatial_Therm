const { User, validate } = require("../models/user"),
	{ pick } = require("lodash"),
	bcrypt = require("bcrypt"),
	moment = require("moment"),
	express = require("express"),
	asyncMiddleware = require("../middleware/async"),
	router = express.Router();

// All registered users

router.get(
	"/all",
	asyncMiddleware(async (req, res) => {
		const users = await User.find()
			.select("_id name email")
			.sort({ name: 1 });
		console.log(users);
		return res.json({ users: users });
	}),
);

// Register a new User

// POST to /user/register,
// In Postman, use Raw and pass in email, username, DOB and password
// as a JSON formatted doc.
// Before sending POST request, create a file in root,
// name it .env and add this line -->
// Jwt_Auth_Secret="your secret"
// Otherwise you'll get error!

router.post(
	"/register",
	asyncMiddleware(async (req, res) => {
		const { error } = validate(req.body);
		if (error)
			return res
				.status(400)
				.json({ err: true, reason: error.details[0].message });

		let user = await User.findOne({ email: req.body.email });
		if (user)
			return res
				.status(400)
				.json({ err: true, reason: "User already exists!" });

		// if (!moment(req.body.DOB, "MM/DD/YYYY").isValid()) {
		// 	return res
		// 		.status(400)
		// 		.json({ err: true, reason: "Date format should be MM/DD/YYYY" });
		// }
		user = new User(pick(req.body, ["username", "email", "password"]));
		const salt = await bcrypt.genSalt(10);
		user.password = await bcrypt.hash(user.password, salt);
		await user.save();
		const token = user.generateAuthToken();

		return res
			.header("x-auth-token", token)
			.json({ id: user._id, message: "Registration successful!" });
	}),
);

module.exports = router;
