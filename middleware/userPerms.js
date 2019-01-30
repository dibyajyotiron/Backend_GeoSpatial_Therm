const { InactiveUser, NotPermitted } = require("../utils/errorMessages");
const { includes } = require("lodash");
const isActive = async (req, res, next) => {
  try {
    if (!req.user.isActive)
      return res.status(403).json({ error: true, message: InactiveUser });
    return next();
  } catch (ex) {
    return res.status(ex.statusCode).json({ err: true, reason: ex.message });
  }
};
const hasRoles = roles => {
  return (req, res, next) => {
    if (!includes(roles, req.user.role))
      return res.status(403).json({ error: true, message: NotPermitted });
    return next();
  };
};

function isAdmin(req, res, next) {
  try {
    if (!req.user.role || req.user.role !== "admin")
      return res.status(403).json({
        err: true,
        reason: "Only admin users can perform this action"
      });
    return next();
  } catch (ex) {
    return res.status(ex.statusCode).send(ex.message);
  }
}

const isBotOrAdmin = async (req, res, next) => {
  try {
    if (req.user.role !== "bot" && req.user.role !== "admin") {
      return res.status(403).json({ error: true, message: NotPermitted });
    }
    return next();
  } catch (ex) {
    return res.status(ex.statusCode).json({ err: true, reason: ex.message });
  }
};

module.exports = {
  isActive,
  isAdmin,
  isBotOrAdmin,
  hasRoles
};
