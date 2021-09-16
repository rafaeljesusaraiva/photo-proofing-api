const auth = require("../middleware/authentication");
const express = require('express');

module.exports = app => {
    const controller = app.controllers.image_delivery;

    // STATIC ROUTES (FICHEIROS)
    app.use('/public/cover', express.static('public/album_cover'))
    app.use('/public/album', express.static('public/album_watermarked'))

    // Deliver single image
    app.route('/delivery/:slug/:image').get(auth.isAuthenticated, controller.deliverImage);
    app.route('/delivery-zipped/:orderID').get(auth.isAuthenticated, controller.deliverOrderZipped);
}