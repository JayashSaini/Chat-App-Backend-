const cookie = require('cookie');
const jwt = require('jsonwebtoken');
const { ChatEventEnum } = require('../constants.js');
const { User } = require('../models/auth/user.models.js');
const { ApiError } = require('../utils/ApiError.js');
const Room = require('../models/room.models.js');

const userIdToSocketIdMap = new Map();

const mountJoinChatEvent = (socket) => {
  socket.on(ChatEventEnum.JOIN_CHAT_EVENT, (chatId) => {
    console.log(`User joined the chat 🤝. chatId: `, chatId);
    socket.join(chatId);
  });
};

const mountParticipantTypingEvent = (socket) => {
  socket.on(ChatEventEnum.TYPING_EVENT, (chatId) => {
    socket.in(chatId).emit(ChatEventEnum.TYPING_EVENT, chatId);
  });
};

const mountParticipantStoppedTypingEvent = (socket) => {
  socket.on(ChatEventEnum.STOP_TYPING_EVENT, (chatId) => {
    socket.in(chatId).emit(ChatEventEnum.STOP_TYPING_EVENT, chatId);
  });
};

// Video Calling Events (for multiple participants)
const mountVideoCallEvents = (socket, io) => {
  // Ask admin to join the room
  socket.on(ChatEventEnum.ADMIN_JOIN_REQUEST_EVENT, async (data) => {
    const { user, roomId, socketId } = data;
    try {
      const room = await Room.findOne({ roomId });

      if (room?.admin) {
        // check the requested user is already an admin
        if (user?._id?.toString() == room?.admin?.toString()) {
          io.to(user?._id?.toString()).emit('room:join:approved', { roomId });

          // Notify all participants in the room that the user has joined
          io.to(roomId.toString()).emit('user:joined', {
            username: user?.username,
          });
          return;
        }

        // Check user is already in the room
        const participant = room.participants.find(
          (participant) => participant === user?._id.toString()
        );
        if (participant) {
          // Notify the approved user
          io.to(socketId).emit('room:join:approved', { roomId });

          // Notify all participants in the room that the user has joined
          io.to(roomId.toString()).emit('user:joined', {
            username: user?.username,
          });
          return;
        }

        io.to(room.admin.toString()).emit('admin:room-join-request', {
          user,
          roomId,
        });
      } else {
        socket.emit('error', { message: 'Room or admin not found' });
      }
    } catch (error) {
      socket.emit('error', { message: 'Error fetching room data', error });
    }
  });

  // Handle admin's approval of user joining the room
  socket.on('admin:approve-user', async (data) => {
    const { roomId, userId, username } = data;

    // Validate the presence of roomId and userId
    if (!roomId || !userId) {
      return socket.emit('error', {
        message: 'Room ID and User ID are required',
      });
    }

    try {
      // Find the socket connected to the user
      const userSocket = [...io.sockets.sockets.values()].find(
        (socket) => socket?.user?._id.toString() === userId
      );

      if (!userSocket) {
        return socket.emit('error', { message: 'User is not connected' });
      }

      const socketId = userSocket.id; // Get the Socket ID of the user

      // Find and update the room, adding the user's socket ID to participants
      const room = await Room.findOneAndUpdate(
        { roomId },
        { $addToSet: { participants: userId } }, // Add socketId to participants without duplicates
        { new: true }
      );

      if (!room) {
        return socket.emit('error', { message: 'Room not found' });
      }
      // Notify the approved user to join the room
      io.to(socketId).emit('room:join:approved', { roomId });

      // Notify all participants in the room that a new user has joined
      io.to(roomId.toString()).emit('user:joined', {
        username,
        userId: userId,
      });

      // Add the user to the Socket.IO room
      userSocket.join(roomId.toString());
    } catch (error) {
      // Catch and handle errors during room data update
      socket.emit('error', {
        message: 'Error updating room data',
        error: error.message,
      });
    }
  });

  // Handle rejection of user's join request
  socket.on('admin:reject-user', ({ userId }) => {
    try {
      const userSocket = [...io.sockets.sockets.values()].find(
        (socket) => socket?.user?._id.toString() === userId
      );

      if (!userSocket) {
        return socket.emit('error', { message: 'User is not connected' });
      }

      const socketId = userSocket.id;

      // Notify the rejected user
      io.to(socketId).emit('room:join:rejected', {
        message: 'Your request to join the room was rejected by the admin.',
      });
    } catch (error) {
      // Catch and handle errors during user rejection
      socket.emit('error', {
        message: 'Error rejecting user join request',
        error: error.message,
      });
    }
  });

  // Handle 'offer' event
  socket.on('offer', ({ offer, userId }) => {
    const senderSocketId = userIdToSocketIdMap.get(userId.toString());
    console.log(`Sending offer to ${senderSocketId}`);
    io.to(senderSocketId).emit('offer', offer, senderSocketId);
  });

  // Handle 'answer' event
  socket.on('answer', ({ answer, senderSocketId }) => {
    console.log(`Sending answer to ${senderSocketId}`);
    io.to(senderSocketId).emit('answer', answer, socket.id);
  });

  // Forward ICE candidate from one user to the other
  socket.on('ice-candidate', (candidate, targetSocketId) => {
    io.to(targetSocketId).emit('ice-candidate', candidate, socket.id);
  });

  socket.on('leave-room', async (data) => {
    try {
      const { roomId, user } = data;

      if (!roomId || !user) {
        return socket.emit('error', {
          message: 'Room ID, Socket ID, and User are required',
        });
      }

      const room = await Room.findOne({ roomId });

      if (!room) {
        return socket.emit('error', { message: 'Room not found' });
      }

      const userSocket = [...io.sockets.sockets.values()].find(
        (socket) => socket?.user?._id.toString() === user?._id.toString()
      );

      if (!userSocket) {
        return socket.emit('error', {
          message: 'User socket not found',
        });
      }

      // Notify participants BEFORE user leaves the room
      if (room.admin.toString() === user._id.toString()) {
        io.to(roomId.toString()).emit('admin:leave', {
          username: user.username,
        });
        await Room.findOneAndUpdate(
          { roomId },
          { isActive: false, participants: [] }
        );
      } else {
        io.to(roomId.toString()).emit('user:leave', {
          username: user.username,
        });
        await Room.findOneAndUpdate(
          { roomId },
          { $pull: { participants: user._id } }
        );
      }

      // Remove the user from the socket.io room
      userSocket.leave(roomId);
    } catch (error) {
      console.error('Error in leave-room handler: ', error);
      socket.emit('error', {
        message: 'An error occurred while leaving the room',
      });
    }
  });
};

const initializeSocketIO = (io) => {
  return io.on('connection', async (socket) => {
    try {
      // Parse the cookies from the handshake headers
      const cookies = cookie.parse(socket.handshake.headers?.cookie || '');
      let token = cookies?.accessToken || socket.handshake.auth?.token;

      // set socket id to user id

      if (!token)
        throw new ApiError(401, 'Unauthorized handshake. Token is missing');

      const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

      const user = await User.findById(decodedToken?._id).select(
        '-password -refreshToken'
      );

      if (!user)
        throw new ApiError(401, 'Unauthorized handshake. Invalid token');

      userIdToSocketIdMap.set(user?._id.toString(), socket.id);

      socket.user = user;

      // Create a room for the user
      socket.join(user._id.toString());
      socket.emit(ChatEventEnum.CONNECTED_EVENT); // Notify client of successful connection

      console.log('User connected 🗼. userId: ', user._id.toString());

      // Mount event handlers
      mountJoinChatEvent(socket);
      mountParticipantTypingEvent(socket);
      mountParticipantStoppedTypingEvent(socket);
      mountVideoCallEvents(socket, io);

      socket.on(ChatEventEnum.DISCONNECT_EVENT, () => {
        console.log('User disconnected 🚫. userId: ' + socket.user?._id);
        socket.leave(socket.user._id);
        userIdToSocketIdMap.delete(socket.user?._id.toString());
      });
    } catch (error) {
      socket.emit(
        ChatEventEnum.SOCKET_ERROR_EVENT,
        error?.message || 'Something went wrong while connecting to the socket.'
      );
      userIdToSocketIdMap.delete(socket.user?._id.toString());
      socket.disconnect(true); // Disconnect socket in case of error
    }
  });
};

// Utility function to emit events to a specific room (chat)
const emitSocketEvent = (req, roomId, event, payload) => {
  req.app.get('io').in(roomId).emit(event, payload);
};

module.exports = { initializeSocketIO, emitSocketEvent };
