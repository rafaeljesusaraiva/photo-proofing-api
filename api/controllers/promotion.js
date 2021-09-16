const Promotion = require("../models").promotion;

module.exports = () => {
    const controller = {};
  
    controller.create = (req, res) => {
        const { code, percentage, value, uses } = req.body;
        // Validate request
        if (!code) {
            res.status(400).send({ message: "Code cannot be empty!" });
            return;
        }
        if (!percentage && !value) {
            res.status(400).send({ message: "At least Percentage or Value must be sent!" });
            return;
        }

        const newPromotion = new Promotion({
            code: code,
            percentage: percentage ? percentage : '',
            value: value ? value : '',
            remainingUses: uses ? uses : ''
        });

        newPromotion.save(newPromotion).then(data => { res.send(data); })
        .catch(err => {
            res.status(500).send({
                message:
                err.message || "Some error occurred while creating the photo size."
            });
        });
    };

    controller.findAll = (req, res) => {
        Promotion.find({})
        .then(data => { 
            res.send(data); 
        })
        .catch(err => {
            res.status(500).send({
                message:
                err.message || "Some error occurred while retrieving promotions."
            });
        });
    };

    controller.checkCode = (req, res) => {
        const CODE = req.params.code;
        Promotion.findOne({ code: CODE })
        .then(data => { 
            if (data !== null && data.remainingUses > 0) {
                res.send({
                    status: 'success',
                    message: {
                        status: 'valid',
                        percentage: data.percentage,
                        value: data.value
                    }
                });
            } else {
                res.send({
                    status: 'success',
                    message: {
                        status: 'invalid'
                    }
                })
            }
        })
        .catch(err => {
            res.status(500).send({
                message:
                err.message || "Some error occurred while retrieving promotions."
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

        Promotion.findByIdAndUpdate(id, req.body, { useFindAndModify: false })
        .then(data => {
            if (!data) {
            res.status(404).send({
                message: `Cannot update Promotion with id => (${id}). Maybe Photo Size was not found!`
            });
            } else res.send({ 
                message: `Promotion '${data.code}' was updated successfully.` 
            });
        })
        .catch(err => {
            res.status(500).send({
                message: "Error updating Promotion with id=" + id,
                debug: err
            });
        });
    };

    controller.delete = (req, res) => {
        const id = req.params.id;
        
        Promotion.findByIdAndRemove(id)
        .then(data => {
            if (!data) {
                res.status(404).send({
                message: `Cannot delete Promotion with id=${id}. Maybe Promotion was not found!`
                });
            } else {
                res.send({
                message: "Promotion was deleted successfully!"
                });
            }
        })
        .catch(err => {
            res.status(500).send({
                message: "Could not delete Promotion with id=" + id
            });
        });
    };
  
    return controller;
}