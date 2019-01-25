const mongoose = require("mongoose"),
  jwt = require("jsonwebtoken"),
  Joi = require("joi");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    minlength: 2,
    maxlength: 20
  },
  uid: {
    type: String,
    default: `User${Date.now()}`
  },
  email: {
    type: String,
    required: true,
    unique: true,
    minlength: 5,
    maxlength: 50
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    maxlength: 255
  },
  role: {
    type: String,
    enum: ["bot", "admin", null],
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

function validate(user) {
  const schema = {
    username: Joi.string()
      .min(2)
      .max(20)
      .required(),
    uid: Joi.string(),
    email: Joi.string()
      .min(5)
      .max(50)
      .required()
      .email(),
    password: Joi.string()
      .min(8)
      .max(255)
      .required()
  };
  return Joi.validate(user, schema);
}

userSchema.methods.generateAuthToken = function() {
  const token = jwt.sign(
    {
      _id: this._id,
      username: this.username,
      email: this.email,
      uid: this.uid,
      role: this.role,
      isActive: this.isActive
      // isAdmin: this.isAdmin,
    },
    process.env.Jwt_Auth_Secret,
    {
      expiresIn: "365d"
    }
  );
  return token;
};

module.exports.User = mongoose.model("user", userSchema);
module.exports.validate = validate;
