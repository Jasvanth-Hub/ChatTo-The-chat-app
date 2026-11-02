export class PresenceTracker {
  constructor() {
    this.socketsByUser = new Map();
    this.chatsBySocket = new Map();
    this.onlineUsers = new Set();
  }

  connect(userId, socketId) {
    const sockets = this.socketsByUser.get(userId) || new Set();
    const becameOnline = sockets.size === 0;
    sockets.add(socketId);
    this.socketsByUser.set(userId, sockets);
    this.onlineUsers.add(userId);
    return becameOnline;
  }

  joinChat(socketId, chatId) {
    const chats = this.chatsBySocket.get(socketId) || new Set();
    chats.add(chatId);
    this.chatsBySocket.set(socketId, chats);
  }

  leaveChat(socketId, chatId) {
    const chats = this.chatsBySocket.get(socketId);
    chats?.delete(chatId);
    if (!chats?.size) this.chatsBySocket.delete(socketId);
  }

  disconnect(userId, socketId) {
    const sockets = this.socketsByUser.get(userId);
    if (!sockets?.delete(socketId)) return false;
    this.chatsBySocket.delete(socketId);
    if (sockets.size > 0) return false;

    this.socketsByUser.delete(userId);
    this.onlineUsers.delete(userId);
    return true;
  }
}
