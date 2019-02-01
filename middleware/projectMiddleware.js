const { Project } = require("../models/project"),
  { includes } = require("lodash"),
  { getAllViews } = require("../controllers/baseViewController");

async function hasProjectPerm(user, project, perm = "readUsers") {
  console.log(project.checkPerm(user, perm));
  if (project.checkPerm(user, perm)) return true;
  if (project.group.checkPerm(user, perm)) return true;
  if (project.group.organization) {
    if (project.group.organization.checkPerm(user, perm)) return true;
  }
  let views = await getAllViews(user, perm);
  for (let view of views) {
    const viewProjects = view.projects || [];
    const viewProjectIds = viewProjects.map(p => p.id.toString("hex"));
    if (includes(viewProjectIds, project.id.toString("hex"))) return true;
  }
  return false;
}
const validateProject = async (req, res, next) => {
  const project = await Project.findOne({
    uid: String(req.params.projectUID),
    active: true
  });
  if (!project)
    return res.status(404).json({ error: true, message: "No Projects found!" });
  res.locals.project = project;
  return next();
};

const checkProjectPerm = (perm = "readUsers") => {
  return async (req, res, next) => {
    let project = res.locals.project;
    let user = req.user;
    if (await hasProjectPerm(user, project, perm)) return next();
    return res.status(403).json({
      error: true,
      message: "You do not have necessary permissions to access the resource."
    });
  };
};

module.exports = {
  validateProject,
  checkProjectPerm
};
