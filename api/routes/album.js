const auth = require("../middleware/authentication");

module.exports = app => {
  const controller = app.controllers.album;

  // Create New Album
  app.route('/album').put(auth.isAdmin, controller.create);

  // Get all Albums (client)
  app.route('/album').get(controller.findAll_client);

  // Get all Albums (admin)
  app.route('/album/all').get(auth.isAdmin, controller.findAll_admin);

  // Get one Album (admin)
  app.route('/album/:id').get(auth.isAdmin, controller.findOne_admin);

  // Update Album Info
  app.route('/album/:id').post(auth.isAdmin, controller.update);

  // Delete Album
  app.route('/album/:id').delete(auth.isAdmin, controller.delete);

}