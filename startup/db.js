const winston = require("winston"),
	mongoose = require("mongoose");
module.exports = function() {
	mongoose
		.connect(
			"mongodb://localhost:27017/therm-practice",
			{ useNewUrlParser: true },
		)
		.then(() => {
			winston.info("Database connected!");
		})
		.catch(err => {
			console.error(`${err.name}: MongoDB connection to server failed!`);
		});

	mongoose.set("useCreateIndex", true);
};

// As I've used only local db, I provided the db address, in real world it will be process.ENV.DBPROD or something like this.
