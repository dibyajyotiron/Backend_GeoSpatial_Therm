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
    const { organization } = req.body;
    const { uid: orgaUid } = organization;
    const orgaExist = await Organization.findOne({ uid: orgaUid });
    let organizationId;
    // if organization doesn't exist
    if (!orgaExist) {
      const { error } = validateOrganization(organization);
      if (error) throw new CustomError(400, error.details[0].message);

      const newOrganization = new Organization(organization);
      const savedOrga = await newOrganization.save();
      organizationId = savedOrga._id;
    }
    if (orgaExist) {
      // if organization already there, update from req.body
      organizationId = orgaExist._id;
      if (organization.name) orgaExist.name = organization.name;
      await orgaExist.save();
    }

    const { groups } = req.body;
    if (groups) {
      let groupId;
      for (let group of groups) {
        const {
          uid: groupUid,
          name,
          description,
          readUsers,
          writeUsers,
          projects
        } = group;
        let { owner } = group;
        const groupExist = await Group.findOne({ uid: groupUid });
        if (!groupExist) {
          owner = owner ? owner : { uid: req.user.uid, email: req.user.email };
          const newGroup = new Group({
            uid: groupUid,
            name,
            description,
            owner: { ...owner },
            readUsers,
            writeUsers,
            organization: organizationId
          });

          const savedGroup = await newGroup.save();
          groupId = savedGroup._id;
        }
        if (groupExist) {
          if (group.name) groupExist.name = group.name;
          if (group.description) groupExist.description = group.description;
          if (group.readUsers) groupExist.readUsers = group.readUsers;
          if (group.writeUsers) groupExist.writeUsers = group.writeUsers;
          groupExist.owner.uid = req.user.uid;
          groupExist.owner.email = req.user.email;
          await groupExist.save();
          groupId = groupExist._id;
        }

        if (projects) {
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
              if (project.writeUsers)
                projectExist.writeUsers = project.writeUsers;
              if (project.data.thermalOrtho)
                projectExist.data.thermalOrtho = project.data.thermalOrtho;
              if (project.data.visualOrtho)
                projectExist.data.visualOrtho = project.data.visualOrtho;
              if (project.data.thermalOrthoTiles)
                projectExist.data.thermalOrthoTiles =
                  project.data.thermalOrthoTiles;
              if (project.data.visualOrthoTiles)
                projectExist.data.visualOrthoTiles =
                  project.data.visualOrthoTiles;
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
        }
      }
    }
    return res.json({ err: false, message: "Successfully imported data!" });
  })
};
