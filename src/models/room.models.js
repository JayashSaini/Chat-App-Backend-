const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Define the schema for a Room
const roomSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
    },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    participants: [
      {
        type: String,
      },
    ],
    invites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    password: {
      type: String,
      trim: true,
      required: false, // Optional: Remove if you don't want password protection
    },
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
      default: null,
    },
    isActive: {
      type: Boolean, // Changed to Boolean for clarity
      default: true,
    },
  },
  { timestamps: true }
);

roomSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    this.password = await bcrypt.hash(this.password, 10); // Await added
    next();
  } catch (err) {
    next(err);
  }
});

roomSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// Create the Room model
const Room = mongoose.model('Room', roomSchema);

module.exports = Room;
