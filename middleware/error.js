const winston = require("winston");

module.exports = function(err, req, res, next) {
  winston.error(err.message, err);

  return res.status(err.statusCode).json({
    error: true,
    // statusCode: `${err.statusCode}`,
    reason: `${err.message}`
  });
};
