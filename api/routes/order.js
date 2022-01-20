const auth = require("../middleware/authentication");

module.exports = app => {
  const controller = app.controllers.order;

  // Create New Order
  app.route('/order').put(auth.isAuthenticated, controller.create);

  // Get all Orders (client)
  app.route('/order').get(auth.isAuthenticated, controller.findAll_client);
  // Get all Orders (admin)
  app.route('/order/all_admin').get(auth.isAdmin, controller.findAll_admin);
  
  // Get Order Stats (admin)
  app.route('/order/stats').get(auth.isAdmin, controller.stats_admin);
  // Get Order Info for processing (admin)
  app.route('/order/process_orders').get(auth.isAdmin, controller.process_orders);
  app.route('/order/process_orders_zip').get(auth.isAdmin, controller.process_orders_zip);

  // Get One Order (admin)
  app.route('/order/:id').get(auth.isAdmin, controller.findOne_admin);
  // Update Order Info
  app.route('/order/:id').post(auth.isAdmin, controller.update);
  // Delete Order
  app.route('/order/:id').delete(auth.isAdmin, controller.delete);

}