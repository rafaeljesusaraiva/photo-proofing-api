const auth = require("../middleware/authentication");

module.exports = app => {
  const controller = app.controllers.photo_size;

  // Create New Size
  app.route('/photo_size').put(auth.isAdmin, controller.create);
  // Get all Sizes (public)
  app.route('/photo_size/all').get(controller.findAll_public);
  // Get all Sizes (admin)
  app.route('/photo_size/all_admin').get(auth.isAdmin, controller.findAll_admin);
  // Update Size Info
  app.route('/photo_size/:id').post(auth.isAdmin, controller.update);
  // Delete Size
  app.route('/photo_size/:id').delete(auth.isAdmin, controller.delete);

}