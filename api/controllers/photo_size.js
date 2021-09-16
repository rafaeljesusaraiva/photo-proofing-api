const PhotoSize = require("../models").photo_size;
const Photo = require("../models").photo;

module.exports = () => {
    const controller = {};
  
    controller.create = (req, res) => {
        const { size, price, cost } = req.body;
        // Validate request
        if (!size) {
            res.status(400).send({ message: "Size cannot be empty!" });
            return;
        }
        if (!price) {
            res.status(400).send({ message: "Price cannot be empty!" });
            return;
        }

        let costVariations = []
        if (cost !== undefined && cost.length > 0) {
            for (var i = 0; i < cost.length; i++) {
                costVariations.push({
                    minimumQuantity: cost[i].minQty,
                    price: cost[i].price
                })
            }
        }

        const newPhotoSize = new PhotoSize({
            size: size,
            price: price,
            costVariations: costVariations
        });

        newPhotoSize.save(newPhotoSize).then(data => { res.send(data); })
        .catch(err => {
            res.status(500).send({
                message:
                err.message || "Some error occurred while creating the photo size."
            });
        });
    };

    controller.findAll_public = (req, res) => {
        PhotoSize.find({})
        .then(data => { 
            res.send({
                status: 'success',
                message: data.map(function(item){
                    return {id: item.id, size : item.size, price : item.price}
                })
            }); 
        })
        .catch(err => {
            res.status(500).send({
                message:
                err.message || "Some error occurred while retrieving photo sizes."
            });
        });
    };

    controller.findAll_admin = (req, res) => {
        PhotoSize.find({})
        .then(data => { 
            res.send(data); 
        })
        .catch(err => {
            res.status(500).send({
                message:
                err.message || "Some error occurred while retrieving photo sizes."
            });
        });
    };

    controller.update = (req, res) => {
        if (Object.keys(req.body).length === 0) {
            return res.status(400).send({
                message: "Data to update can not be empty!"
            });
        }

        const id = req.params.id;

        PhotoSize.findByIdAndUpdate(id, req.body, { useFindAndModify: false })
        .then(data => {
            if (!data) {
            res.status(404).send({
                message: `Cannot update Photo Size with id => (${id}). Maybe Photo Size was not found!`
            });
            } else res.send({ 
                message: `Photo Size '${data.size}' was updated successfully.` 
            });
        })
        .catch(err => {
            res.status(500).send({
                message: "Error updating Photo Size with id=" + id,
                debug: err
            });
        });
    };

    controller.delete = (req, res) => {
        const id = req.params.id;

        PhotoSize.findByIdAndRemove(id)
        .then(data => {
            if (!data) {
                res.status(404).send({
                message: `Cannot delete Photo Size with id=${id}. Maybe Photo Size was not found!`
                });
            } else {
                res.send({
                message: "Photo Size was deleted successfully!"
                });
            }
        })
        .catch(err => {
            res.status(500).send({
                message: "Could not delete Photo Size with id=" + id
            });
        });
    };
  
    return controller;
}