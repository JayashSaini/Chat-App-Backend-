const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      default: 'Mark',
    },
    lastName: {
      type: String,
      default: 'Cole',
    },
    email: {
      type: String,
      default: 'swoo@gmail.com',
    },
    phoneNumber: {
      type: String,
      default: '',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Profile', profileSchema);
