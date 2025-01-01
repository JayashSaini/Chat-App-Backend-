const DB_NAME = 'Cluster0';

const UserRolesEnum = {
  ADMIN: 'ADMIN',
  USER: 'USER',
};
const AvailableUserRoles = Object.values(UserRolesEnum);

const UserLoginType = {
  EMAIL_PASSWORD: 'EMAIL_PASSWORD',
  GOOGLE: 'GOOGLE',
};

const AvailableSocialLogins = Object.values(UserLoginType);

const USER_TEMPORARY_TOKEN_EXPIRY = 20 * 60 * 1000; // 20 minutes

const USER_OTP_EXPIRY = 2;

const ChatEventEnum = Object.freeze({
  // ? when send a join room request
  // ? once user is ready to go
  CONNECTED_EVENT: 'connected',
  // ? when user gets disconnected
  DISCONNECT_EVENT: 'disconnect',
  // ? when user joins a socket room
  JOIN_CHAT_EVENT: 'joinChat',
  // ? when participant gets removed from group, chat gets deleted or leaves a group
  LEAVE_CHAT_EVENT: 'leaveChat',
  // ? when admin updates a group name
  UPDATE_GROUP_NAME_EVENT: 'updateGroupName',
  // ? when new message is received
  MESSAGE_RECEIVED_EVENT: 'messageReceived',
  // ? when there is new one on one chat, new group chat or user gets added in the group
  NEW_CHAT_EVENT: 'newChat',
  // ? when there is an error in socket
  SOCKET_ERROR_EVENT: 'socketError',
  // ? when participant stops typing
  STOP_TYPING_EVENT: 'stopTyping',
  // ? when participant starts typing
  TYPING_EVENT: 'typing',
  // ? when message is deleted
  MESSAGE_DELETE_EVENT: 'messageDeleted',
});

const AvailableChatEvents = Object.values(ChatEventEnum);

const RoomLinkFormat = 'https://chicchat.com/room/join=';

module.exports = {
  DB_NAME,
  UserRolesEnum,
  AvailableUserRoles,
  UserLoginType,
  AvailableSocialLogins,
  USER_TEMPORARY_TOKEN_EXPIRY,
  USER_OTP_EXPIRY,
  ChatEventEnum,
  AvailableChatEvents,
  RoomLinkFormat,
};
