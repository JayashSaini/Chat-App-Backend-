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

const mountRoomChatBoxEvents = (socket) => {
  socket.on('user:send-message', ({ roomId, message }) => {
    socket.in(roomId.toString()).emit('participants:received-message', message);
  });
  socket.on('user:typing', (roomId) => {
    socket.in(roomId).emit('participants:typing');
  });
  socket.on('user:stop-typing', (roomId) => {
    socket.in(roomId).emit('participants:stop-typing');
  });
};

const mountParticipantStoppedTypingEvent = (socket) => {
  socket.on(ChatEventEnum.STOP_TYPING_EVENT, (chatId) => {
    socket.in(chatId).emit(ChatEventEnum.STOP_TYPING_EVENT, chatId);
  });
};

const mountNotifyNewUserJoined = (socket, io) => {
  socket.on('participant:join:notify', (roomId, user) => {
    const userSocket = [...io.sockets.sockets.values()].find(
      (socket) => socket?.user?._id.toString() === user?._id.toString()
    );

    if (!userSocket) {
      return socket.emit('error', {
        message: 'Failed to find user socket to join the room',
      });
    }
    const socketId = userSocket.id;
    // Notify all participants in the room that the user has joined
    socket.to(roomId.toString()).emit('user:joined', {
      user: user,
      socketId: socketId,
    });
  });
};

const mountParticipantFeatures = (socket) => {
  socket.on('user:emoji:reaction', ({ userId, emoji, roomId }) => {
    socket
      .in(roomId.toString())
      .emit('participant:emoji:reaction', { userId, emoji });
  });
  socket.on('user:hand:raised', ({ userId, roomId }) => {
    console.log('called user:hand:raised');
    socket.in(roomId.toString()).emit('participant:hand:raised', { userId });
  });
};

// Video Calling Events (for multiple participants)
const mountAdminRoomEvents = (socket, io) => {
  // Ask admin to join the room
  socket.on('admin:join-request', async (data) => {
    const { user, roomId } = data;
    try {
      const room = await Room.findOne({ roomId });

      if (room?.admin) {
        // Find the socket connected to the user
        const userSocket = [...io.sockets.sockets.values()].find(
          (socket) => socket?.user?._id.toString() === user?._id.toString()
        );

        if (!userSocket) {
          return socket.emit('error', {
            message: 'User socket not found',
          });
        }

        // check the requested user is already an admin
        if (user?._id?.toString() == room?.admin?.toString()) {
          await userSocket.join(room.roomId.toString());
          room.isActive = true;
          await room.save();

          io.to(user?._id?.toString()).emit('room:join:approved', { roomId });

          return;
        }

        io.to(room.admin.toString()).emit('admin:user-join-request', {
          user,
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
    const { roomId, user } = data;

    // Validate the presence of roomId and userId
    if (!roomId || !user) {
      return socket.emit('error', {
        message: 'Room ID and User are required',
      });
    }

    try {
      // Find the socket connected to the user
      const userSocket = [...io.sockets.sockets.values()].find(
        (socket) => socket?.user?._id.toString() === user?._id.toString()
      );

      if (!userSocket) {
        return socket.emit('error', { message: 'User is not connected' });
      }

      const socketId = userSocket.id; // Get the Socket ID of the user

      // Find and update the room, adding the user's socket ID to participants
      const room = await Room.findOneAndUpdate(
        { roomId },
        { $addToSet: { participants: user?._id.toString() } }, // Add socketId to participants without duplicates
        { new: true }
      );

      if (!room) {
        return socket.emit('error', { message: 'Room not found' });
      }
      // Notify the approved user to join the room
      io.to(socketId).emit('room:join:approved', { roomId });

      // Add the user to the Socket.IO room
      await userSocket.join(roomId.toString());
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
        message: 'Your join request was declined by the admin.',
      });
    } catch (error) {
      // Catch and handle errors during user rejection
      socket.emit('error', {
        message: 'Error rejecting user join request',
        error: error.message,
      });
    }
  });
};

const mountConnectionSharingEvent = (socket, io) => {
  // Handle offer
  socket.on('offer', (offer, to, { userId, mediaState }) => {
    const userSocket = [...io.sockets.sockets.values()].find(
      (socket) => socket?.user?._id.toString() === userId.toString()
    );
    if (!userSocket) {
      return socket.emit('error', { message: 'User socket not found' });
    }
    const socketId = userSocket.id;
    console.log('offer send to : ', to);
    socket.to(to).emit('offer', offer, socketId, { userId, mediaState }); // Send offer to specific user
  });

  // Handle answer
  socket.on('answer', (answer, to, { userId, mediaState }) => {
    console.log('answer send to : ', to);
    const userSocket = [...io.sockets.sockets.values()].find(
      (socket) => socket?.user?._id.toString() === userId.toString()
    );
    if (!userSocket) {
      return socket.emit('error', { message: 'User socket not found' });
    }
    const socketId = userSocket.id;
    socket.to(to).emit('answer', answer, socketId, { userId, mediaState }); // Send answer to specific user
  });

  // Handle ICE candidates
  socket.on('ice-candidate', (candidate, to, userId) => {
    console.log('ice-candidate send to : ', to);
    const userSocket = [...io.sockets.sockets.values()].find(
      (socket) => socket?.user?._id.toString() === userId.toString()
    );
    if (!userSocket) {
      return socket.emit('error', { message: 'User socket not found' });
    }
    const socketId = userSocket.id;
    socket.to(to).emit('ice-candidate', candidate, socketId); // Send ICE candidate
  });
};

const mountLeaveEvents = (socket, io) => {
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
        io.to(roomId.toString()).emit('user:leave', {
          userId: user._id.toString(),
        });
        await Room.findOneAndUpdate(
          { roomId },
          {
            isActive: false,
            $pull: {
              participants: user._id.toString(), // Remove user from participants array
            },
          }
        );
      } else {
        io.to(roomId.toString()).emit('user:leave', {
          userId: user._id.toString(),
        });
        await Room.findOneAndUpdate(
          { roomId },
          {
            $pull: {
              participants: user._id.toString(), // Remove user from participants array
            },
          }
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
  socket.on('admin:kick-user', async ({ userId, roomId }) => {
    try {
      const room = await Room.findOne({ roomId });
      if (!room) {
        return socket.emit('error', { message: 'Room not found' });
      }

      // Optimized user socket lookup (consider maintaining a user-to-socket map)
      const userSocket = [...io.sockets.sockets.values()].find(
        (socket) => socket?.user?._id.toString() === userId.toString()
      );
      if (!userSocket) {
        return socket.emit('error', { message: 'User socket not found' });
      }

      const userSocketId = userSocket.id;

      // Notify the kicked user
      io.to(userSocketId).emit('user:kicked');

      // Notify the room about the user leaving
      io.to(roomId).emit('user:leave', { userId });

      // Ensure the user leaves the room
      await userSocket.leave(roomId);
    } catch (err) {
      console.error('Error handling admin:kick-user:', err);
      socket.emit('error', { message: 'Internal server error' });
    }
  });
};
const moundParticipantMediaUpdate = (socket) => {
  socket.on('user:media-update', (roomId, userId, mediaState) => {
    socket.to(roomId).emit('participant:media-update', userId, mediaState);
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
      mountAdminRoomEvents(socket, io);
      mountConnectionSharingEvent(socket, io);
      mountLeaveEvents(socket, io);
      moundParticipantMediaUpdate(socket);
      mountNotifyNewUserJoined(socket, io);
      mountParticipantFeatures(socket);
      mountRoomChatBoxEvents(socket);

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
