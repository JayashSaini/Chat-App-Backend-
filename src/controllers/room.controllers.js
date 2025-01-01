const { ApiError } = require('../utils/ApiError.js');
const { ApiResponse } = require('../utils/ApiResponse.js');
const { asyncHandler } = require('../utils/asyncHandler.js');
const Room = require('../models/room.models.js');
const { v4: uniqueId } = require('uuid');

const getRoomById = asyncHandler(async (req, res) => {
  const { roomId } = req.params;

  if (!roomId) {
    throw new ApiError(400, 'Room ID is required');
  }

  const aggregationPipeline = [
    // Convert the strings in participants array to ObjectId if necessary
    {
      $match: {
        roomId: roomId,
      },
    },
    {
      $addFields: {
        participants: {
          $map: {
            input: '$participants',
            as: 'participant',
            in: { $toObjectId: '$$participant' }, // Convert string to ObjectId
          },
        },
      },
    },
    // Lookup user details for each participant ID
    {
      $lookup: {
        from: 'users', // Replace with your actual users collection name
        localField: 'participants', // Array of participant IDs
        foreignField: '_id', // Match with the _id field in users collection
        as: 'participants_details', // New field to store user details
      },
    },

    // Optionally project only the fields you need
    {
      $project: {
        _id: 1,
        roomId: 1,
        admin: 1,
        participants: 1,
        participants_details: 1,
        isActive: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ];

  const roomDetails = await Room.aggregate(aggregationPipeline).exec();

  if (!roomDetails || roomDetails.length === 0) {
    throw new ApiError(404, 'Room not found');
  }
  const participants = roomDetails[0].participants_details;
  const updatedParticipants = participants.filter(
    (p) => p._id.toString() !== req.user?._id.toString()
  );

  delete roomDetails[0].participants_details;

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { participants: updatedParticipants, room: roomDetails[0] },
        'Room retrieved successfully'
      )
    );
});

const createRoom = asyncHandler(async (req, res) => {
  const roomId = uniqueId().slice(0, 12);

  // Create the room in the database
  const room = await Room.create({
    admin: req?.user?._id,
    roomId: roomId,
    participants: [req?.user?._id],
  });

  if (!room) {
    throw new ApiError(500, 'Failed to create room');
  }

  // Access Socket.IO instance
  const io = req.app.get('io');
  if (!io) {
    throw new ApiError(500, 'Socket.IO instance not found');
  }

  // Find the user's socket
  const userSocket = [...io.sockets.sockets.values()].find(
    (socket) =>
      socket.user && socket.user._id.toString() === req?.user?._id.toString()
  );

  if (!userSocket) {
    throw new ApiError(500, 'Failed to find user socket to join the room');
  }

  // Add the user to the Socket.IO room
  userSocket.join(roomId);

  return res
    .status(201)
    .json(new ApiResponse(201, { room }, 'Room created successfully'));
});

const joinRoom = asyncHandler(async (req, res) => {
  const { link, roomId, password } = req.body;
  let id = roomId;

  if (link?.length > 0) {
    // Extract the value after the "=" in the link
    const valueAfterEqual = link.split('=')[1];
    if (valueAfterEqual) {
      id = valueAfterEqual;
    } else {
      throw new ApiError(400, 'Invalid link');
    }
  }

  const room = await Room.findOne({
    roomId: id,
  });

  if (!room) {
    throw new ApiError(404, 'Room not found');
  }
  if (!room?.isActive) {
    throw new ApiError(403, 'Room is not active');
  }
  if (!link?.length > 0) {
    if (room?.password?.length > 0) {
      if (password) {
        const isPasswordValid = await room.isPasswordCorrect(password);

        if (!isPasswordValid) {
          throw new ApiError(401, 'Invalid password');
        }
      } else {
        throw new ApiError(400, 'Password is required');
      }
    }
  }

  res.status(200).json(new ApiResponse(200, { room }, 'Join Successfully.'));
});

module.exports = {
  createRoom,
  joinRoom,
  getRoomById,
};
