const jwt = require("jsonwebtoken"),
  { Unauthenticated } = require("../utils/errorMessages"),
  { CustomError } = require("../utils/errors");

function auth(req, res, next) {
  const token = req.header("x-auth-token");
  if (!token) throw new CustomError(401, Unauthenticated);

  try {
    const decoded = jwt.verify(token, process.env.Jwt_Auth_Secret);
    req.user = decoded;

    next();
  } catch (ex) {
    res.status(400).json({ error: true, reason: "Invalid token!" });
  }
}

module.exports = auth;
