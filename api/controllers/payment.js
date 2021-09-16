const Payment = require("../models").payment;
const Order = require("../models").order;

module.exports = () => {
    const controller = {};
  
    controller.create = async (req, res) => {
        const { client, order, method, ammount } = req.body;
        // Validate request
        if (!client) {
            res.status(400).send({ message: "Client cannot be empty!" });
            return;
        }
        if (!order) {
            res.status(400).send({ message: "Order cannot be empty!" });
            return;
        }
        if (!method) {
            res.status(400).send({ message: "Method cannot be empty!" });
            return;
        }
        if (!ammount) {
            res.status(400).send({ message: "Ammount cannot be empty!" });
            return;
        }

        // check Client and order
        let orderObject = await Order.findOne({ _id: order })
                                        .populate('promotion')
                                        .then(data => { if (data.length === 0) throw 'Order not found!'; return data })
                                        .catch(err => {
                                            res.status(500).send({
                                                message: "Error adding payment.",
                                                debug: err
                                            });
                                        });
        if (orderObject === null) return;

        if (orderObject.client != client) {
            res.status(500).send({
                message: "Error adding payment.",
                debug: "Client sent is different from order"
            });
            return;
        }

        // Get total price from order
        let discount = 0;
        if (orderObject.promotion !== null) {
            let promo = orderObject.promotion;
            if (promo.percentage != null) {
                discount = orderObject.totalNoPromotion * promo.percentage;
            } else if (promo.value != null) {
                discount = promo.value;
            }
            discount = Math.round((discount + Number.EPSILON) * 100) / 100
        }

        const newPayment = new Payment({
            client: client,
            order: order,
            total: orderObject.totalNoPromotion - discount,
            method: method
        });

        orderObject.payment = newPayment._id;
        await orderObject.save()

        newPayment.save(newPayment).then(data => { 
            res.send(data); 
        })
        .catch(err => {
            res.status(500).send({
                message:
                err.message || "Some error occurred while creating the photo size."
            });
        });
    };

    controller.findAll = (req, res) => {
        Payment.find()
        .populate('client')
        .populate('order')
        .populate('order.promotion')
        .then(data => { 
            res.send(data)
        })
        .catch(err => {
            res.status(500).send({
                message:
                err.message || "Some error occurred while retrieving orders."
            });
        });
    };

    controller.delete = async (req, res) => {
        const id = req.params.id;
        
        // check if payment valid
        let foundPayment = await Payment.findOneAndDelete({ _id: id })
                                        .then(data => { if (data.length === 0) throw 'Payment not found!'; return data })
                                        .catch(err => {
                                            res.status(500).send({
                                                message: "Error adding payment.",
                                                debug: err
                                            });
                                        });
        if (foundPayment === null) return;

        // remove payment from order
        let foundOrder = await Order.findOne({ payment: id })
                                    .then(data => { if (data.length === 0) throw 'Order not found!'; return data })
                                    .catch(err => {
                                        res.status(500).send({
                                            message: "Error adding payment.",
                                            debug: err
                                        });
                                    });
        if (foundOrder === null) return;

        // remove payment itself
        foundOrder.payment = null;
        await foundOrder.save();

        res.json({
            message: 'success'
        });
    };
  
    return controller;
}