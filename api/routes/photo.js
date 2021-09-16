const auth = require("../middleware/authentication");

module.exports = app => {
  const controller = app.controllers.photo;

  // Create New Photo
  app.route('/photo').put(auth.isAdmin, controller.create);
  // Get all Photos
  app.route('/photo').get(auth.isAdmin, controller.findAll);

  // SPECIFIC ROUTE FOR CLIENTS THAT PAYED FOR PHOTOS (SHOW ALL PAYED)
  app.route('/photo/all_ordered').get(auth.isAuthenticated, controller.findAllOrdered);

  // Delete Photo
  app.route('/photo/:id').delete(auth.isAdmin, controller.delete);

}