const auth = require("../middleware/authentication");

module.exports = app => {
  const controller = app.controllers.payment;

  // Create New Payment
  app.route('/payment').put(auth.isAdmin, controller.create);
  // Get all Payments
  app.route('/payment').get(auth.isAdmin, controller.findAll);
  // Delete Payment
  app.route('/payment/:id').delete(auth.isAdmin, controller.delete);

}