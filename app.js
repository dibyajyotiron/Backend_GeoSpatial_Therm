require("dotenv").config();

const express = require("express"),
  app = express(),
  winston = require("winston"),
  morgan = require("morgan"),
  port = process.env.PORT || 3000;

require("./startup/logging")();
require("./startup/routes")(app);
require("./startup/db")();
require("./startup/prod")(app);
if (!process.env.Jwt_Auth_Secret) {
  throw new Error("Fatal Error! Jwt_Auth_Secret is not defined!");
}
app.use(
  require("forest-express-mongoose").init({
    modelsDir: __dirname + "/models", // Your models directory.
    envSecret: process.env.FOREST_ENV_SECRET,
    authSecret: process.env.FOREST_AUTH_SECRET,
    mongoose: require("mongoose") // The mongoose database connection.
  })
);

morgan.token("id", function getId(req) {
  return req.id;
});

app.use(
  morgan(
    ":id Method:':method' Url:':url' Status:':status' Agent:':user-agent' Date: ':date[web]'"
  )
);

app.listen(port, () => {
  winston.info(`Server started on port ${port}!`);
});
