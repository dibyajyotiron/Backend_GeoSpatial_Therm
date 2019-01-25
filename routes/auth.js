const { User } = require("../models/user"),
  Joi = require("joi"),
  bcrypt = require("bcrypt"),
  express = require("express"),
  asyncMiddleware = require("../middleware/async"),
  { CustomError } = require("../utils/errors"),
  {
    NotFound,
    Unauthorized,
    InvalidUser,
    BadRequest
  } = require("../utils/errorMessages"),
  router = express.Router();

// Login

router.post(
  "/",
  asyncMiddleware(async (req, res) => {
    const { error } = validate(req.body);

    if (error) throw new CustomError(400, error.details[0].message);

    let user = await User.findOne({ email: req.body.username });
    if (!user) throw new CustomError(400, InvalidUser);

    const validPassword = await bcrypt.compare(
      req.body.password,
      user.password
    );
    if (!validPassword) throw new CustomError(400, InvalidUser);
    // return res.status(400).json({ err: true, reason: "Invalid password!" });

    const token = user.generateAuthToken();

    return res
      .header("x-auth-token", token)
      .json({ token, message: "Success!" });
  })
);

function validate(user) {
  const schema = {
    username: Joi.string()
      .min(2)
      .max(20)
      .required(),

    password: Joi.string()
      .min(8)
      .max(255)
      .required()
  };
  return Joi.validate(user, schema);
}

module.exports = router;
