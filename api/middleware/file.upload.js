const util = require("util");
const multer = require("multer");
const pathSys = require('path');
const fs = require('fs');

let storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    let path = "/public/temp_upload/";

    if (!fs.existsSync(__basedir + path)) {
      fs.mkdir(__basedir + path, error => cb(error, __basedir + path))
    }

    return cb(null, pathSys.join(__basedir, path))
  },
  filename: (req, file, cb) => {
    let fileName = file.originalname;

    const match = ["image/png", "image/jpeg", "image/jpg"];
    if (match.indexOf(file.mimetype) === -1) {
      var message = `${file.originalname} is invalid. Only accept png/jpeg.`;
      return callback(message, null);
    }

    cb(null, fileName);
  },
});

let uploadFile = multer({ storage: storage }).array("images", 2000);
let uploadFilesMiddleware = util.promisify(uploadFile);

module.exports = uploadFilesMiddleware;