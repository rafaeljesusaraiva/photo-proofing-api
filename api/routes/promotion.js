const auth = require("../middleware/authentication");

module.exports = app => {
  const controller = app.controllers.promotion;

  // Create New Promotion
  app.route('/promotion').put(auth.isAdmin, controller.create);
  // Get all Promotions
  app.route('/promotion').get(auth.isAdmin, controller.findAll);
  // Check Promotion
  app.route('/promotion/:code').get(controller.checkCode);
  // Update Promotion Info
  app.route('/promotion/:id').post(auth.isAdmin, controller.update);
  // Delete Promotions
  app.route('/promotion/:id').delete(auth.isAdmin, controller.delete);

}