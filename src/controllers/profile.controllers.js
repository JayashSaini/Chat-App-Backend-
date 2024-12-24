const Profile = require('../models/profile.models.js');
const { ApiResponse } = require('../utils/ApiResponse.js');

const getMyProfile = async (req, res, next) => {
  try {
    let profile = await Profile.findOne({
      owner: req.user._id,
    });
    if (!profile) {
      profile = await Profile.create({
        email: 'john@gmail.com',
        phoneNumber: '9192100000',
        firstName: 'John',
        lastName: 'Deo',
        owner: req.user._id,
      });
    }
    return res
      .status(200)
      .json(new ApiResponse(200, profile, 'User profile fetched successfully'));
  } catch (error) {
    next(error);
  }
};

const updateMyProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, phoneNumber, email } = req.body;

    // Check if a profile exists for the current user
    let profile = await Profile.findOne({ owner: req.user._id });

    if (!profile) {
      // If no profile exists, create a new one
      profile = await Profile.create({
        owner: req.user._id,
        firstName,
        lastName,
        phoneNumber,
        email,
      });
    } else {
      // If a profile exists, update it
      profile = await Profile.findOneAndUpdate(
        { owner: req.user._id },
        {
          $set: {
            firstName,
            lastName,
            phoneNumber,
            email,
          },
        },
        { new: true }
      );
    }

    // Send response
    return res
      .status(200)
      .json(new ApiResponse(200, profile, 'User profile updated successfully'));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
};
