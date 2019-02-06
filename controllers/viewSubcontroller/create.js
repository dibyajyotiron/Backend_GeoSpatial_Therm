const { View } = require("../../models/view"),
  { Project } = require("../../models/project"),
  { Organization } = require("../../models/organization"),
  { CustomError } = require("../../utils/errors"),
  { NotFound, Unauthorized } = require("../../utils/errorMessages"),
  { hasAccess } = require("../../utils/lib");

module.exports = {
  create: async function(req) {
    const { projects } = req.body;
    const { email } = req.user;

    const { orgUid } = req.params;

    const foundOrg = await Organization.findById(orgUid);
    if (!foundOrg) throw new CustomError(404, NotFound);

    const foundProjects = await Project.find({ uid: { $in: projects } });

    let projectsWithWriteAccess = [];

    for (let project of foundProjects) {
      const hasProjectWriteAccess = hasAccess(project, "writeUsers", email);
      const isProjectOwner = project.owner.email === email;

      if (hasProjectWriteAccess || isProjectOwner)
        projectsWithWriteAccess.push(project);
    }
    if (!projectsWithWriteAccess.length)
      throw new CustomError(400, "Provide projects where you've write access!");

    const newView = new View(req.body);
    newView.uid = `${newView.name.split(" ").shift()}-UN_${Date.now()}`;
    newView.projects = projectsWithWriteAccess;
    newView.polygon = req.body.polygon;
    newView.owner = { ...req.user };
    newView.organization = foundOrg;
    // newView.read_users = [...req.body.read_users];
    // newView.write_users = req.body.write_users ? [...req.body.write_users] : [];
    newView.important = true;
    await newView.save();
  }
};
