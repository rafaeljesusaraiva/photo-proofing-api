module.exports = mongoose => {
    var schema = mongoose.Schema(
        {
            code: { type: String, required: true, index: { unique: true } },
            percentage: { type: Number },
            value: { type: Number },
            remainingUses: { type: Number, min: 0, max: 999, default: 1 }
        },
        { timestamps: true }
    );

    schema.method("toJSON", function() {
      const { __v, _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });
  
    return mongoose.model("promotion", schema);
};