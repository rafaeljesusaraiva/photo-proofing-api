const dbConfig = require("../../config/db.config.js");

const mongoose = require("mongoose");
mongoose.Promise = global.Promise;

const db = {};
db.mongoose = mongoose;
db.url = dbConfig.url;

// MODELS
db.account = require("./account.model.js")(mongoose);
db.album = require("./album.model.js")(mongoose);
db.order = require("./order.model.js")(mongoose);
db.payment = require("./payment.model.js")(mongoose);
db.photo_size = require("./photo_size.model.js")(mongoose);
db.photo = require("./photo.model.js")(mongoose);
db.promotion = require("./promotion.model.js")(mongoose);

module.exports = db;