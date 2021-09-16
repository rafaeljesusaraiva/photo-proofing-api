module.exports = mongoose => {
    const orderPhases = ['Recebida', 'Por Pagar', 'A Processar', 'Em Entrega', 'Entregue', 'Cancelada']
    const processingIndex = orderPhases.indexOf('A Processar');

    var schema = mongoose.Schema(
        {
            orderCount: { type: Number, required: true, min: 0 },
            client: { type: mongoose.Schema.Types.ObjectId, ref: 'account', required: true },
            payment: { type: mongoose.Schema.Types.ObjectId, ref: 'payment' },
            promotion: { type: mongoose.Schema.Types.ObjectId, ref: 'promotion' },
            products: [
                {
                    item: { type: mongoose.Schema.Types.ObjectId, ref: 'photo' },
                    size: { type: mongoose.Schema.Types.ObjectId, ref: 'photo_size' }
                }
            ],
            totalNoPromotion: { type: Number, required: true, min: 0 },
            status: { type: String, default: 'Recebida', required: true },
            note: { type: String }
        },
        { timestamps: true }
    );

    schema.method("toJSON", function() {
      const { __v, _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });

    schema.methods.canDeliverDigital = function (cb) {
        if (orderPhases.indexOf(this.status) >= processingIndex) {
            return true;
        } else {
            return false;
        }
    }

    schema.methods.isValidStatus = function (cb) {
        if (orderPhases.indexOf(cb) === -1) {
            return false;
        } else {
            return true;
        }

    }

    schema.methods.updateStatus = function (cb) {
        if (orderPhases.indexOf(cb) === -1)
            return { updated: false, err: 'Supplied status not permitted.' }
        
        this.status = cb;
        return { updated: true, err: 'none' }
    }

    schema.methods.addProduct = function (cb) {
        this.products.push({ item: cb.item, size: cb.size })
        return;
    }

    schema.methods.remProduct = function (cb) {
        this.products = this.products.filter(item => item._id !== cb)
        return;
    }
  
    return mongoose.model("order", schema);
};