const express = require("express"),
  auth = require("../routes/auth"),
  users = require("../routes/users"),
  organizations = require("../routes/organizations"),
  projects = require("../routes/projects"),
  groups = require("../routes/groups"),
  special = require("../routes/special"),
  features = require("../routes/features"),
  views = require("../routes/views"),
  metrics = require("../routes/metricRoutes"),
  error = require("../middleware/error");

module.exports = function(app) {
  app.use(express.json({ limit: "50mb" }));
  app.use("/user", users); // Sign Up
  app.use("/user/login", auth); // Log In
  app.use("/user/organizations", organizations);
  app.use("/user/projects", projects);
  app.use("/user/groups", groups);
  app.use("/user/special", special);
  app.use("/user/features", features);
  app.use("/user/views", views);
  app.use("/user/metrics", metrics);

  app.use(error);
};
