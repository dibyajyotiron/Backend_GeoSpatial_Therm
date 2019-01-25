module.exports.hasAccess = function(property, type, email) {
  return property[type].length > 0
    ? JSON.parse(property[type].map(user => user.email === email).toString())
    : false;
};

// foundGroup[readUsers]length > 0
// 	? JSON.parse(
// 			foundGroup.readUsers
// 				.map(user => user.email === req.user.email)
// 				.toString(),
// 	  )
// 	: false;
