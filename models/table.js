const mongoose = require("mongoose"),
  { Schema } = mongoose;

const { polygonSchema, rawImage } = require("./misc");

const tableSchema = new Schema(
  {
    uid: {
      type: String,
      required: true
    },
    polygon: polygonSchema,
    class_id: {
      type: Number,
      required: true
    },
    class_name: {
      type: String,
      required: true
    },
    raw_images: [rawImage],
    temperature_difference: Number,
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true
    },
    num_modules_horizontal: Number,
    num_modules_vertical: Number
  },
  { timestamps: true }
);

tableSchema.pre("find", function(next) {
  this.populate({
    path: "project"
  });
  next();
});

tableSchema.pre("findOne", function(next) {
  this.populate({
    path: "project"
  });
  next();
});

module.exports = mongoose.model("Table", tableSchema);
