const { Project, validateProject } = require("../models/project"),
  { Group } = require("../models/group"),
  { Organization, validateOrganization } = require("../models/organization"),
  { CustomError } = require("../utils/errors"),
  {
    Unauthenticated,
    Unauthorized,
    NotFound
  } = require("../utils/errorMessages"),
  asyncMiddleware = require("../middleware/async");

module.exports = {
  specialController: asyncMiddleware(async (req, res) => {
    let { organization } = req.body || {};
    const {
      uid: orgaUid,
      name: orgName,
      active: orgActive = "true"
    } = organization;
    console.log(orgaUid);
    orgaExist = orgaUid ? await Organization.findOne({ uid: orgaUid }) : {};

    if (orgaUid) {
      organization = await Organization.findOneAndUpdate(
        { uid: orgaUid },
        {
          $set: {
            uid: orgaUid,
            name: orgName,
            active: orgActive
          }
        },
        { upsert: true, runValidators: true, returnNewDocument: true }
      );
    }

    const { groups = [] } = req.body;
    let groupId;
    for (let group of groups) {
      let {
        uid: groupUid,
        name,
        description,
        active,
        readUsers,
        writeUsers,
        projects = [],
        owner
      } = group;

      const groupExist = await Group.findOne({ uid: groupUid });

      if (!groupExist) {
        groupExist = new Group({ uid: String(groupUid) });
      }

      groupExist.name = name ? name : groupExist.name;
      groupExist.description = description
        ? description
        : groupExist.description;
      groupExist.active = active ? active : groupExist.active;
      groupExist.owner = owner
        ? owner
        : { uid: req.user.uid, email: req.user.email };
      groupExist.organization = organization
        ? organization
        : groupExist.organization;
      groupExist.read = readUsers ? readUsers : [];
      groupExist.write = writeUsers ? writeUsers : [];

      await groupExist.save();

      // if (projects) {
      for (let project of projects) {
        const { uid: projectUid } = project;
        const projectExist = await Project.findOne({ uid: projectUid });

        if (!projectExist) {
          const { error } = validateProject(project);
          if (error) throw new CustomError(400, error.details[0].message);

          let { owner: projectOwner } = project;
          owner = projectOwner
            ? projectOwner
            : { uid: req.user.uid, email: req.user.email };

          const newProject = new Project({
            ...project,
            owner: { ...owner },
            group: groupId
          });
          await newProject.save();
        }
        if (projectExist) {
          if (project.name) projectExist.name = project.name;
          if (project.date) projectExist.date = project.date;
          if (project.readUsers) projectExist.readUsers = project.readUsers;
          if (project.writeUsers) projectExist.writeUsers = project.writeUsers;
          if (project.data.thermalOrtho)
            projectExist.data.thermalOrtho = project.data.thermalOrtho;
          if (project.data.visualOrtho)
            projectExist.data.visualOrtho = project.data.visualOrtho;
          if (project.data.thermalOrthoTiles)
            projectExist.data.thermalOrthoTiles =
              project.data.thermalOrthoTiles;
          if (project.data.visualOrthoTiles)
            projectExist.data.visualOrthoTiles = project.data.visualOrthoTiles;
          if (project.data.thermalDSM)
            projectExist.data.thermalDSM = project.data.thermalDSM;
          if (project.data.cameraParams)
            projectExist.data.cameraParams = project.data.cameraParams;
          if (project.data.rawImages)
            projectExist.data.rawImages = project.data.rawImages;
          if (project.data.thermalImages)
            projectExist.data.thermalImages = project.data.thermalImages;
          if (project.data.pdfReport)
            projectExist.data.pdfReport = project.data.pdfReport;
          if (project.data.reportData)
            projectExist.data.reportData = project.data.reportData;
          await projectExist.save();
        }
      }
      // }
    }
    return res.json({ err: false, message: "Successfully imported data!" });
  })
};
