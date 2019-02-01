const { uniqBy, includes, intersection } = require("lodash"),
  mongoose = require("mongoose"),
  { ALLOWED_ROLES } = require("../constants");
// { userObj } = require("./view");
const userObj = new mongoose.Schema(
  {
    uid: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true
    }
  },
  { _id: false }
);
module.exports = {
  userPermissions: function(schema) {
    schema.add({
      readUsers: [userObj],
      writeUsers: [userObj]

      //   labelsRead: [String],
      //   labelsWrite: [String]
    });

    schema.pre("save", function(next) {
      if (!this.owner) return next();
      if (this.important === true || this.important === undefined) {
        this.writeUsers.push({ uid: this.owner.uid, email: this.owner.email });
      } else this.readUsers.push({ uid: this.owner.uid, email: this.owner.email });

      if (this.important === false) this.writeUsers = [];

      this.readUsers = uniqBy(this.readUsers, obj => obj.uid);
      this.writeUsers = uniqBy(this.writeUsers, obj => obj.uid);
      return next();
    });

    schema.methods.checkPerm = function(user, perm = "readUsers") {
      user.organization = "ORG1";

      if (includes(ALLOWED_ROLES, user.role)) return true;
      if (
        this.organization &&
        this.organization === user.organization &&
        this.owner.uid === user.uid
        // (user.is_owner || user.is_manager)
      )
        return true;

      //   let labelPerms = {
      //     read: ["labelsRead", "labelsWrite"],
      //     write: ["labelsWrite"]
      //   };

      //   let validLabels = [];
      //   for (let currentPerm of labelPerms[perm]) {
      //     let currentValidLabels = this[currentPerm] || [];
      //     validLabels.push(...currentValidLabels);
      //   }

      //   if (intersection(user.labels, validLabels).length > 0) return true;

      let perms = {
        readUsers: ["readUsers", "writeUsers"],
        writeUsers: ["writeUsers"]
      };

      let validUserIds = [];
      for (let currentPerm of perms[perm]) {
        let currentValidUserIds = this[currentPerm].map(u =>
          u.uid.toString("hex")
        );
        validUserIds.push(...currentValidUserIds);
      }
      return includes(validUserIds, user.obj.uid.toString("hex"));
    };

    schema.methods.addPerm = function(user, perm = "readUsers") {
      let existingUserIds = this[perm].map(u => u.uid.toString("hex"));
      if (!includes(existingUserIds, user.obj.uid.toString("hex"))) {
        this[perm].push({ uid: user.obj.uid, email: user.obj.email });
        return true;
      }
      return false;
    };
  }
};
