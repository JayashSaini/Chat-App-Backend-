const mongoose = require('mongoose');
const { ChatEventEnum } = require('../constants.js');
const Chat = require('../models/chat.models.js');
const ChatMessage = require('../models/message.models.js');
const { emitSocketEvent } = require('../socket/index.js');
const { ApiError } = require('../utils/ApiError.js');
const { ApiResponse } = require('../utils/ApiResponse.js');
const { asyncHandler } = require('../utils/asyncHandler.js');
const { getLocalPath } = require('../utils/helper.js');
const { uploadOnCloudinary } = require('../utils/cloudinary.js');

/**
 * @description Utility function which returns the pipeline stages to structure the chat message schema with common lookups
 * @returns {mongoose.PipelineStage[]}
 */
const chatMessageCommonAggregation = () => {
  return [
    {
      $lookup: {
        from: 'users',
        foreignField: '_id',
        localField: 'sender',
        as: 'sender',
        pipeline: [
          {
            $project: {
              username: 1,
              avatar: 1,
              email: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        sender: { $first: '$sender' },
      },
    },
  ];
};

const getAllMessages = asyncHandler(async (req, res) => {
  const { chatId } = req.params;

  const selectedChat = await Chat.findById(chatId);

  if (!selectedChat) {
    throw new ApiError(404, 'Chat does not exist');
  }

  // Only send messages if the logged in user is a part of the chat he is requesting messages of
  if (!selectedChat.participants?.includes(req.user?._id)) {
    throw new ApiError(400, 'User is not a part of this chat');
  }

  const messages = await ChatMessage.aggregate([
    {
      $match: {
        chat: new mongoose.Types.ObjectId(chatId),
      },
    },
    ...chatMessageCommonAggregation(),
    {
      $sort: {
        createdAt: -1,
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, messages || [], 'Messages fetched successfully')
    );
});

const sendMessage = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { content } = req.body;

  if (!content && !req.files?.attachments?.length) {
    throw new ApiError(400, 'Message content or attachment is required');
  }

  const selectedChat = await Chat.findById(chatId);

  if (!selectedChat) {
    throw new ApiError(404, 'Chat does not exist');
  }

  let messageFiles = [];
  if (req.files && req.files.attachments?.length > 0) {
    // Use Promise.all to handle async operations inside map
    messageFiles = await Promise.all(
      req.files.attachments.map(async (attachment) => {
        const localPath = getLocalPath(attachment.filename);
        const uploadedAttachment = await uploadOnCloudinary(localPath);

        if (!uploadedAttachment) {
          throw new ApiError(500, 'Error uploading file to cloud');
        }

        return {
          url: uploadedAttachment.url,
          localPath,
        };
      })
    );
  }

  // Create a new message instance with appropriate metadata
  const message = await ChatMessage.create({
    sender: new mongoose.Types.ObjectId(req.user._id),
    content: content || '',
    chat: new mongoose.Types.ObjectId(chatId),
    attachments: messageFiles,
  });

  // Update the chat's last message
  const chat = await Chat.findByIdAndUpdate(
    chatId,
    {
      $set: { lastMessage: message._id },
    },
    { new: true }
  );

  // Structure the message
  const messages = await ChatMessage.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(message._id) } },
    ...chatMessageCommonAggregation(),
  ]);
  const receivedMessage = messages[0];

  if (!receivedMessage) {
    throw new ApiError(500, 'Internal server error');
  }

  // Emit socket event for the new message
  chat.participants.forEach((participantObjectId) => {
    if (participantObjectId.toString() === req.user._id.toString()) return;

    emitSocketEvent(
      req,
      participantObjectId.toString(),
      ChatEventEnum.MESSAGE_RECEIVED_EVENT,
      receivedMessage
    );
  });

  return res
    .status(201)
    .json(new ApiResponse(201, receivedMessage, 'Message saved successfully'));
});

const deleteMessage = asyncHandler(async (req, res) => {
  //controller to delete chat messages and attachments

  const { chatId, messageId } = req.params;

  //Find the chat based on chatId and checking if user is a participant of the chat
  const chat = await Chat.findOne({
    _id: new mongoose.Types.ObjectId(chatId),
    participants: req.user?._id,
  });

  if (!chat) {
    throw new ApiError(404, 'Chat does not exist');
  }

  //Find the message based on message id
  const message = await ChatMessage.findOne({
    _id: new mongoose.Types.ObjectId(messageId),
  });

  if (!message) {
    throw new ApiError(404, 'Message does not exist');
  }

  // Check if user is the sender of the message
  if (message.sender.toString() !== req.user._id.toString()) {
    throw new ApiError(
      403,
      'You are not the authorised to delete the message, you are not the sender'
    );
  }

  //deleting the message from DB
  await ChatMessage.deleteOne({
    _id: new mongoose.Types.ObjectId(messageId),
  });

  //Updating the last message of the chat to the previous message after deletion if the message deleted was last message
  if (chat.lastMessage.toString() === message._id.toString()) {
    const lastMessage = await ChatMessage.findOne(
      { chat: chatId },
      {},
      { sort: { createdAt: -1 } }
    );

    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: lastMessage ? lastMessage?._id : null,
    });
  }
  // logic to emit socket event about the message deleted  to the other participants
  chat.participants.forEach((participantObjectId) => {
    // here the chat is the raw instance of the chat in which participants is the array of object ids of users
    // avoid emitting event to the user who is deleting the message
    if (participantObjectId.toString() === req.user._id.toString()) return;
    // emit the delete message event to the other participants frontend with delete messageId as the payload
    emitSocketEvent(
      req,
      participantObjectId.toString(),
      ChatEventEnum.MESSAGE_DELETE_EVENT,
      message
    );
  });

  return res
    .status(200)
    .json(new ApiResponse(200, message, 'Message deleted successfully'));
});

module.exports = { getAllMessages, sendMessage, deleteMessage };
