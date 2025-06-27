import express from "express";
import { auth } from "../middleware/auth.js";
import {
  getOrCreateChat,
  getUserChats,
  getChatMessages,
  sendMessage,
  markChatAsRead,
  searchDoctors,
  deleteMessage,
  getUnreadCount,
} from "../controllers/chatController.js";

const chatRouter = express.Router();

// All routes require authentication
chatRouter.use(auth);

// GET /chat/search-doctors - Search doctors to start new chat
chatRouter.get("/search-doctors", searchDoctors);

// GET /chat/unread-count - Get total unread message count
chatRouter.get("/unread-count", getUnreadCount);

// GET /chat/list - Get user's chat list
chatRouter.get("/list", getUserChats);

// GET /chat/:recipientId - Get or create chat with specific doctor
chatRouter.get("/:recipientId", getOrCreateChat);

// GET /chat/:chatId/messages - Get chat messages with pagination
chatRouter.get("/:chatId/messages", getChatMessages);

// POST /chat/:chatId/send - Send a message
chatRouter.post("/:chatId/send", sendMessage);

// PUT /chat/:chatId/read - Mark chat as read
chatRouter.put("/:chatId/read", markChatAsRead);

// DELETE /chat/:chatId/messages/:messageId - Delete a message
chatRouter.delete("/:chatId/messages/:messageId", deleteMessage);

export default chatRouter;
