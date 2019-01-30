const httpStatusCodes = require("http-status-codes"),
  tokenGenerator = require("uuid-token-generator"),
  tokenGen = new tokenGenerator(256, tokenGenerator.BASE64),
  { getAppUsers, oktaClient } = require("../okta");

const getOrganizationUsers = async (req, res) => {
  let oktaUsers = await getAppUsers();
  let users = [];
  await oktaUsers.forEach(user => {
    users.push({
      uid: user.id,
      email: user.profile.email,
      name: user.profile.name
    });
  });
  // filter for own organization!
  return res.json(users);
};

const createOktaUser = async (userDetails, activate = false) => {
  try {
    let createdUser = await oktaClient.createUser(
      { profile: userDetails },
      { activate: activate }
    );
    return { success: true, user: createdUser };
  } catch (err) {
    return { error: true, message: err.message };
  }
};

module.exports = {
  getOrganizationUsers,

  create: async (req, res) => {
    let userDetails = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      login: req.body.email,
      mobilePhone: req.body.phone,
      token: tokenGen.generate()
    };

    result = await createOktaUser(userDetails, false);
    if (result.success)
      return res.json({
        success: true,
        message: `Successfully registered ${userDetails.email}`
      });
    return res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json(result);
  },

  validate: async (req, res, next) => {
    try {
      req
        .sanitizeBody("email")
        .normalizeEmail({ all_lowercase: true })
        .trim();
      req.check("email", "Invalid Email").isEmail();
      req
        .check("phone", "Invalid Phone number")
        .notEmpty()
        .isInt()
        .isLength({
          min: 7,
          max: 10
        });

      req
        .check("firstName", "Invalid first name")
        .notEmpty()
        .isLength({ min: 3 });
      req
        .check("lastName", "Invalid last name")
        .notEmpty()
        .isLength({ min: 3 });
      const validationErrors = await req.getValidationResult();
      if (!validationErrors.isEmpty()) {
        let messages = validationErrors.array().map(e => e.msg);
        return res
          .status(httpStatusCodes.BAD_REQUEST)
          .json({ error: true, message: messages[0] });
      } else next();
    } catch (error) {
      return next(error);
    }
  }
};
