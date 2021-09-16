module.exports = mongoose => {
    var schema = mongoose.Schema(
        {
            client: { type: mongoose.Schema.Types.ObjectId, ref: 'account', required: true },
            order: { type: mongoose.Schema.Types.ObjectId, ref: 'order', required: true },
            total: { type: Number, required: true },
            method: { type: String, required: true },
        },
        { timestamps: true }
    );

    schema.method("toJSON", function() {
      const { __v, _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });
  
    return mongoose.model("payment", schema);
};