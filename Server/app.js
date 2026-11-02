import express from "express";
import { connectDB } from "./utils/features.js";
import { errorMiddleware } from "./middlewares/error.js";
import cookieParser from "cookie-parser";
import { Server } from "socket.io";
import { createServer } from "http";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import cors from "cors";
import { v2 as cloudinary } from "cloudinary";
import {
  CHAT_JOINED,
  CHAT_LEAVED,
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  ONLINE_USERS,
  START_TYPING,
  STOP_TYPING,
} from "./constants/events.js";
import { getSockets } from "./lib/helper.js";
import { Message } from "./models/message.js";
import { Chat } from "./models/chat.js";
import { corsOptions } from "./constants/config.js";
import { socketAuthenticator } from "./middlewares/auth.js";
import { isChatMember } from "./lib/socketAuthorization.js";
import { createOrGetMessage } from "./lib/idempotentMessage.js";
import { PresenceTracker } from "./lib/presence.js";

import userRoute from "./routes/user.js";
import chatRoute from "./routes/chat.js";
import adminRoute from "./routes/admin.js";

const mongoURI = process.env.MONGO_URI;
const port = process.env.PORT || 3000;
const envMode = (process.env.NODE_ENV || "PRODUCTION").trim();
const adminSecretKey = process.env.ADMIN_SECRET_KEY || "adsasdsdfsdfsdfd";
const presence = new PresenceTracker();
const userSocketIDs = presence.socketsByUser;
const onlineUsers = presence.onlineUsers;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: corsOptions,
});

app.set("io", io);

app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));

app.use("/chatto/user", userRoute);
app.use("/chatto/chat", chatRoute);
app.use("/chatto/admin", adminRoute);

app.get("/", (req, res) => {
  res.json({
    status:true,
    message:"It's working .."
  })
});

io.use((socket, next) => {
  cookieParser()(
    socket.request,
    {},
    async (err) => await socketAuthenticator(err, socket, next)
  );
});

io.on("connection", (socket) => {
  const user = socket.user;
  const userId = user._id.toString();
  const becameOnline = presence.connect(userId, socket.id);
  if (becameOnline) socket.broadcast.emit(ONLINE_USERS, Array.from(onlineUsers));

  socket.on(NEW_MESSAGE, async (payload = {}, acknowledge) => {
    const ack = typeof acknowledge === "function" ? acknowledge : () => {};
    if (!payload || typeof payload !== "object") {
      return ack({ success: false, message: "Invalid message payload" });
    }
    const { chatId, message } = payload;
    const clientMessageId = payload.clientMessageId || randomUUID();
    if (!mongoose.isValidObjectId(chatId) || typeof message !== "string" || !message.trim() ||
      typeof clientMessageId !== "string" || clientMessageId.length > 128) {
      return ack({ success: false, message: "Invalid chat or message", retryable: false, clientMessageId });
    }

    try {
      const chat = await Chat.findById(chatId);
      if (!isChatMember(chat, user._id)) {
        return ack({ success: false, message: "You are not allowed to send messages in this chat" });
      }

      const { message: savedMessage, created } = await createOrGetMessage({
        Message,
        content: message.trim(),
        senderId: user._id,
        chatId: chat._id,
        clientMessageId,
      });
      const messageForRealTime = {
        ...savedMessage.toObject(),
        sender: { _id: user._id, name: user.name },
      };
      const membersSocket = getSockets(chat.members);
      const eventData = {
        chatId: chat._id.toString(),
        message: messageForRealTime,
        clientMessageId,
      };

      io.to(membersSocket).emit(NEW_MESSAGE, eventData);
      if (created) io.to(membersSocket).emit(NEW_MESSAGE_ALERT, { chatId: chat._id.toString() });
      ack({ success: true, message: messageForRealTime, clientMessageId });
    } catch (error) {
      console.error("Failed to persist realtime message:", error.message);
      ack({ success: false, message: "Message could not be saved", retryable: true, clientMessageId });
    }
  });

  const emitChatPresenceEvent = async (event, payload = {}) => {
    if (!payload || !mongoose.isValidObjectId(payload.chatId)) return;
    const chat = await Chat.findById(payload.chatId).select("members");
    if (!isChatMember(chat, user._id)) return;
    const membersSocket = getSockets(chat.members);
    socket.to(membersSocket).emit(event, { chatId: chat._id.toString() });
  };

  socket.on(START_TYPING, (payload) => {
    emitChatPresenceEvent(START_TYPING, payload).catch((error) => console.error(error));
  });

  socket.on(STOP_TYPING, (payload) => {
    emitChatPresenceEvent(STOP_TYPING, payload).catch((error) => console.error(error));
  });

  socket.on(CHAT_JOINED, async (payload = {}) => {
    const chatId = payload?.chatId;
    if (!mongoose.isValidObjectId(chatId)) return;
    const chat = await Chat.findById(chatId).select("members");
    if (!isChatMember(chat, user._id)) return;
    presence.joinChat(socket.id, chat._id.toString());
    io.to(getSockets(chat.members)).emit(ONLINE_USERS, Array.from(onlineUsers));
  });

  socket.on(CHAT_LEAVED, async (payload = {}) => {
    const chatId = payload?.chatId;
    if (!mongoose.isValidObjectId(chatId)) return;
    const chat = await Chat.findById(chatId).select("members");
    if (!isChatMember(chat, user._id)) return;
    presence.leaveChat(socket.id, chat._id.toString());
    io.to(getSockets(chat.members)).emit(ONLINE_USERS, Array.from(onlineUsers));
  });

  socket.on("disconnect", () => {
    const becameOffline = presence.disconnect(userId, socket.id);
    if (becameOffline) {
      socket.broadcast.emit(ONLINE_USERS, Array.from(onlineUsers));
    }
  });
});

app.use(errorMiddleware);

const startServer = async () => {
  await connectDB(mongoURI);
  // The unique idempotency index must exist before socket writes are accepted.
  await Message.createIndexes();
  server.listen(port, () => {
    console.log(`Server is running on port ${port} in ${envMode} Mode`);
  });
};

startServer().catch((error) => {
  console.error("Server startup failed:", error.message);
  process.exitCode = 1;
});

export { envMode, adminSecretKey, userSocketIDs };
