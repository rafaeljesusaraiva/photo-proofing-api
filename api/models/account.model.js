const bcrypt = require("bcryptjs");

module.exports = mongoose => {
    var schema = mongoose.Schema(
        {
            name: { type: String, required: true },
            email: { type: String, required: true, index: { unique: true } },
            password: { type: String, required: true },
            phoneNumber: { type: Number },
            role: { type: String, default: 'client' },
            token: { type: String },
            emailValidationToken: { type: String },
            cart: { type: String }
        },
        { timestamps: true }
    );

    // Executes on Account Creation
    schema.pre("save", function (next) {
        const user = this
      
        if (!user.isModified('password') || this.isNew) {
          bcrypt.genSalt(10, function (saltError, salt) {
            if (saltError) {
              return next(saltError)
            } else {
              bcrypt.hash(user.password, salt, function(hashError, hash) {
                if (hashError) {
                  return next(hashError)
                }
      
                user.password = hash
                next()
              })
            }
          })
        } else {
          return next()
        }
    })

    // Executes on Account Update
    schema.pre('findOneAndUpdate', async function(next) {
      const password = this.getUpdate().password;
      if (!password) {
          return next();
      }

      try {
          const salt = bcrypt.genSaltSync();
          const hash = bcrypt.hashSync(password, salt);
          this.getUpdate().password = hash;
          return next();
      } catch (error) {
          return next(error);
      }
    })

    schema.statics.findByCredentials = async (email, password) => {
      const user = await Account.findOne({ email });
      if (!user) {
        throw new Error('Unable to login.');
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        throw new Error('Unable to login.');
      }
      return user;
    };

    schema.method("toJSON", function() {
      const { __v, _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });

    schema.methods.isAdmin = function (cb) {
        if (this.role === 'admin') {
            return true;
        } else {
            return false;
        }
    }

    schema.methods.isSelf = function (cb) {
      if (this._id == cb) {
        return true;
      }
      return false;
  }
  
    return mongoose.model("account", schema);
};