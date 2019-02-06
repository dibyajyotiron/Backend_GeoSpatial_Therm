const { View } = require("../../models/view"),
  { Project } = require("../../models/project"),
  { Organization } = require("../../models/organization"),
  { CustomError } = require("../../utils/errors"),
  { NotFound, Unauthorized } = require("../../utils/errorMessages"),
  { hasAccess } = require("../../utils/lib");
module.exports = {
  updateView: async function(req) {
    const { projects } = req.body;
    const { read_users, write_users } = req.body;
    const { email } = req.user;

    foundView = await View.findOne({ uid: req.body.uid });
    if (!foundView) throw new CustomError(404, NotFound);

    if (!foundView.checkPerm(req.user, "writeUsers"))
      throw new CustomError(403, Unauthorized);

    foundView.issueTypes = req.body.foundView
      ? req.body.foundView
      : foundView.issueTypes;

    foundView.temperatures =
      Object.keys(req.body.temperatures).length > 0
        ? { ...req.body.temperatures }
        : foundView.temperatures;

    foundView.writeUsers =
      write_users && write_users.length > 0
        ? [...write_users]
        : foundView.writeUsers;

    foundView.readUsers =
      read_users && read_users.length > 0
        ? [...read_users]
        : foundView.readUsers;

    foundView.name = req.body.name ? req.body.name : foundView.name;

    const foundProjects = await Project.find({
      uid: { $in: projects }
    });
    let projectsWithWriteAccess = [];
    for (let project of foundProjects) {
      const hasProjectWriteAccess = hasAccess(project, "writeUsers", email);
      const isProjectOwner = project.owner.email === email;

      if (hasProjectWriteAccess || isProjectOwner)
        projectsWithWriteAccess.push(project);
    }
    if (!projectsWithWriteAccess.length)
      throw new CustomError(400, "Provide projects where you've write access!");
    foundView.projects = req.body.projects
      ? projectsWithWriteAccess
      : foundView.projects;

    foundView.polygon = req.body.polygon ? req.body.polygon : foundView.polygon;
    const saveView = await foundView.save();
    return saveView;
  }
};
