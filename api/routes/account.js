const auth = require("../middleware/authentication");

module.exports = app => {
  const controller = app.controllers.account;

  // Create Account
  app.route('/account').put(controller.create);
  // Login
  app.route('/account/login').post(controller.login);
  // Reset Password
  app.route('/account/resetPassword').post(controller.resetPassword);
  // Change Password
  app.route('/account/changePassword').post(controller.userChangePassword);

  // Get Self (all info)
  app.route('/account/self').get(auth.isAuthenticated, controller.findSelf);
  // Update Cart
  app.route('/account/updateCart').post(auth.isAuthenticated, controller.updateCart);

  // Get Account by Name or Email or Phone
  app.route('/account').get(auth.isAdmin, controller.findOne);
  // Get all Accounts
  app.route('/account/all').get(auth.isAdmin, controller.findAll);
  // Update Account Info
  app.route('/account/:id').post(auth.isAuthenticated, controller.update);
  // Delete Account
  app.route('/account/:id').delete(auth.isAdmin, controller.delete);

}