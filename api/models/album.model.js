function slugify(string) {
    const a = 'àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìıİłḿñńǹňôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;'
    const b = 'aaaaaaaaaacccddeeeeeeeegghiiiiiiiilmnnnnoooooooooprrsssssttuuuuuuuuuwxyyzzz------'
    const p = new RegExp(a.split('').join('|'), 'g')
  
    return string.toString().toLowerCase()
        .replace(/\s+/g, '-') // Replace spaces with -
        .replace(p, c => b.charAt(a.indexOf(c))) // Replace special characters
        .replace(/&/g, '-and-') // Replace & with 'and'
        .replace(/[^\w\-]+/g, '') // Remove all non-word characters
        .replace(/\-\-+/g, '-') // Replace multiple - with single -
        .replace(/^-+/, '') // Trim - from start of text
        .replace(/-+$/, '') // Trim - from end of text
}

module.exports = mongoose => {
    var schema = mongoose.Schema(
        {
            title: { type: String, required: true, index: { unique: true } },
            cover: { type: String },
            totalImages: { type: Number, required: true, default: 0 },
            date_event: { type: Date },
            date_available: { type: Date },
            date_finalOrder: { type: Date },
            slug: { type: String, index: { unique: true } },
            images: [
                { type: mongoose.Schema.Types.ObjectId, ref: 'photo' }
            ],
            watermarked: [
                { type: mongoose.Schema.Types.ObjectId, ref: 'photo' }
            ]
        },
        { timestamps: true }
    );

    schema.methods.isImageOrWatermark = function (cb) {
        // cb => image ID
        if (this.images.includes(cb)) {
            return 'image';
        } else if (this.watermarked.includes(cb)) {
            return 'watermark'
        } else {
            return false;
        }
    }

    schema.methods.addImage = async function (cb) {
        let local = this;
        try {
            local.images.push(cb._id);
            local.totalImages = local.totalImages + 1;
            return await local.save();
        } catch(error) {
            return error;
        }
    }

    schema.methods.addWatermarked = async function (cb) {
        let local = this;
        try {
            local.watermarked.push(cb._id);
            return await local.save();
        } catch(error) {
            return error;
        }
    }

    schema.methods.removeImage = function (cb) {
        this.images = this.images.filter(
            item => item._id !== cb._id
        );
        this.totalImages = this.totalImages - 1;
        this.save();
    }

    schema.methods.removeWatermarked = function (cb) {
        this.watermarked = this.watermarked.filter(
            item => item._id !== cb._id
        );
        this.save();
    }

    schema.method("toJSON", function() {
      const { __v, _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });
  
    return mongoose.model("album", schema);
};