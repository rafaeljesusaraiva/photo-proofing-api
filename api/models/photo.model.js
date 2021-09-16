module.exports = mongoose => {
    var schema = mongoose.Schema(
        {
            filename: { type: String, required: true },
            album: { type: mongoose.Schema.Types.ObjectId, ref: 'album', required: true }
        },
        { timestamps: true }
    );

    schema.method("toJSON", function() {
      const { __v, _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });
  
    return mongoose.model("photo", schema);
};