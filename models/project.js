const { View } = require("./view"),
  { getViewMetrics } = require("./view"),
  { includes } = require("lodash"),
  { ALLOWED_ROLES } = require("../constants"),
  plugins = require("./plugins"),
  mongoose = require("mongoose"),
  Joi = require("joi");

const userSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  }
});

const validUserSchema = {
  uid: Joi.string().required(),
  email: Joi.string()
    .email()
    .required()
};
const projectSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  date: Date,
  owner: userSchema,
  active: {
    type: Boolean,
    default: true
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Group"
  },
  readUsers: [userSchema],
  writeUsers: [userSchema],
  data: {
    thermalOrtho: Object,
    visualOrtho: Object,
    thermalOrthoTiles: Object,
    visualOrthoTiles: Object,
    thermalDSM: Object,
    cameraParams: Object,
    rawImages: Object,
    thermalImages: Object,
    pdfReport: Object,
    reportData: Object
  }
});

projectSchema.pre("find", function(next) {
  this.populate({
    path: "group"
  });
  next();
});

projectSchema.pre("findOne", function(next) {
  this.populate({
    path: "group"
  });
  next();
});

projectSchema.pre("save", async function(next) {
  if (this.date) this.date.setHours(0, 0, 0, 0);
  let view = (await View.findOne({ fromProject: this })) || new View();
  console.log(this.name);
  view.uid = view.uid
    ? view.uid
    : `${this.name.split(" ").shift()}-UN_${Date.now()}`;

  console.log(view.uid);
  view.name = this.name;
  view.projects = [this];
  view.important = view.important || false;
  view.fromProject = this;
  view.owner = this.owner;
  view.organization = this.group.organization;
  view.readUsers = [
    ...(this.toJSON().readUsers || []),
    ...(this.toJSON().writeUsers || []),
    ...(this.toJSON().group.readUsers || []),
    ...(this.toJSON().group.writeUsers || [])
  ];
  //   view.labelsRead = [
  //     ...(this.labelsRead || []),
  //     ...(this.labelsWrite || []),
  //     ...(this.group.labelsRead || []),
  //     ...(this.group.labelsWrite || [])
  //   ];

  // update metrics on view save
  // view.metrics = await getViewMetrics(view);
  //   console.log(view.metrics);
  await view.save();
  next();
});

function validate(project) {
  const schema = {
    uid: Joi.string().required(),
    name: Joi.string()
      .min(2)
      .max(50)
      .required(),
    date: Joi.date(),
    owner: Joi.object(validUserSchema),
    group: Joi.string()
      .min(24)
      .max(24),
    readUsers: Joi.array().items(Joi.object(validUserSchema)),
    writeUsers: Joi.array().items(Joi.object(validUserSchema)),
    data: Joi.object({
      thermalOrtho: Joi.object().allow(null),
      visualOrtho: Joi.object().allow(null),
      thermalOrthoTiles: Joi.object().allow(null),
      visualOrthoTiles: Joi.object().allow(null),
      thermalDSM: Joi.object().allow(null),
      cameraParams: Joi.object().allow(null),
      rawImages: Joi.object().allow(null),
      thermalImages: Joi.object().allow(null),
      pdfReport: Joi.object().allow(null),
      reportData: Joi.object().allow(null)
    })
  };
  return Joi.validate(project, schema);
}

projectSchema.plugin(plugins.userPermissions);

module.exports.userSchema = userSchema;
module.exports.Project = mongoose.model("Project", projectSchema);
module.exports.validateProject = validate;
module.exports.validUserSchema = validUserSchema;
