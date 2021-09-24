module.exports = mongoose => {
    var schema = mongoose.Schema(
        {
            size: { type: String, required: true, index: { unique: true } },
            price: { type: Number, required: true },
            costVariations: [
                {
                    minimumQuantity: { type: Number, required: true },
                    price: { type: Number, required: true }
                }
            ],
            public: { type: String, required: true, default: "true" }
        },
        { timestamps: true }
    );

    schema.method("toJSON", function() {
      const { __v, _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });
  
    return mongoose.model("photo_size", schema);
};