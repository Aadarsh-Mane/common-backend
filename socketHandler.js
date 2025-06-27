import jwt from "jsonwebtoken";
import Chat from "./models/chatSchema.js";
import hospitalDoctors from "./models/hospitalDoctorSchema.js";

const SECRET = "DOCTOR";

// Store active users and their socket connections
const activeUsers = new Map();
const userSockets = new Map();

export const socketHandler = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      const decoded = jwt.verify(token, SECRET);
      const user = await hospitalDoctors
        .findById(decoded.id)
        .select("-password");

      if (!user) {
        return next(new Error("Authentication error: User not found"));
      }

      socket.userId = decoded.id;
      socket.usertype = decoded.usertype;
      socket.userData = user;
      next();
    } catch (error) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.userId;

    console.log(`Doctor ${socket.userData.doctorName} connected: ${socket.id}`);

    // Store user connection
    activeUsers.set(userId, {
      socketId: socket.id,
      userData: socket.userData,
      lastSeen: new Date(),
    });

    userSockets.set(socket.id, userId);

    // Join user to their personal room
    socket.join(`user_${userId}`);

    // Emit user online status to all their chat partners
    emitUserStatusToContacts(socket, userId, "online");

    // Handle joining a specific chat room
    socket.on("join_chat", async (data) => {
      try {
        const { chatId } = data;

        // Verify user is participant in this chat
        const chat = await Chat.findById(chatId);
        if (chat && chat.participants.some((p) => p.equals(userId))) {
          socket.join(`chat_${chatId}`);
          console.log(`User ${userId} joined chat ${chatId}`);

          // Mark chat as read when user joins
          await chat.markAsRead(userId);

          // Notify other participants that user joined
          socket.to(`chat_${chatId}`).emit("user_joined_chat", {
            userId,
            userName: socket.userData.doctorName,
            chatId,
          });
        }
      } catch (error) {
        console.error("Error joining chat:", error);
        socket.emit("error", { message: "Failed to join chat" });
      }
    });

    // Handle leaving a chat room
    socket.on("leave_chat", (data) => {
      try {
        const { chatId } = data;
        socket.leave(`chat_${chatId}`);
        console.log(`User ${userId} left chat ${chatId}`);

        // Notify other participants that user left
        socket.to(`chat_${chatId}`).emit("user_left_chat", {
          userId,
          userName: socket.userData.doctorName,
          chatId,
        });
      } catch (error) {
        console.error("Error leaving chat:", error);
      }
    });

    // Handle sending messages
    socket.on("send_message", async (data) => {
      try {
        const {
          chatId,
          content,
          messageType = "text",
          fileUrl,
          fileName,
        } = data;

        // Validate chat and user participation
        const chat = await Chat.findById(chatId);
        if (!chat) {
          socket.emit("error", { message: "Chat not found" });
          return;
        }

        if (!chat.participants.some((p) => p.equals(userId))) {
          socket.emit("error", { message: "Access denied" });
          return;
        }

        // Create message data
        const messageData = {
          senderId: userId,
          senderName: socket.userData.doctorName,
          content: content.trim(),
          messageType,
          fileUrl,
          fileName,
          readBy: [{ userId, readAt: new Date() }], // Mark as read by sender
        };

        // Add message to chat
        await chat.addMessage(messageData);

        // Get the newly added message
        const newMessage = chat.messages[chat.messages.length - 1];

        // Emit message to all participants in the chat
        io.to(`chat_${chatId}`).emit("new_message", {
          chatId,
          message: newMessage,
          chat: {
            _id: chat._id,
            lastMessage: chat.lastMessage,
            updatedAt: chat.updatedAt,
          },
        });

        // Send push notification to offline users
        const offlineParticipants = chat.participants.filter(
          (participantId) =>
            !participantId.equals(userId) &&
            !activeUsers.has(participantId.toString())
        );

        if (offlineParticipants.length > 0) {
          // Here you can implement push notification service
          sendPushNotifications(offlineParticipants, {
            title: `New message from ${socket.userData.doctorName}`,
            body: content,
            chatId,
          });
        }

        console.log(
          `Message sent in chat ${chatId} by ${socket.userData.doctorName}`
        );

        // Acknowledge message sent
        socket.emit("message_sent", {
          success: true,
          messageId: newMessage._id,
          timestamp: newMessage.createdAt,
        });
      } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Handle message read receipts
    socket.on("mark_messages_read", async (data) => {
      try {
        const { chatId } = data;

        const chat = await Chat.findById(chatId);
        if (chat && chat.participants.some((p) => p.equals(userId))) {
          await chat.markAsRead(userId);

          // Notify other participants about read status
          socket.to(`chat_${chatId}`).emit("messages_read", {
            chatId,
            userId,
            userName: socket.userData.doctorName,
            readAt: new Date(),
          });
        }
      } catch (error) {
        console.error("Error marking messages as read:", error);
      }
    });

    // Handle typing indicators
    socket.on("typing_start", (data) => {
      const { chatId } = data;
      socket.to(`chat_${chatId}`).emit("user_typing", {
        userId,
        userName: socket.userData.doctorName,
        chatId,
      });
    });

    socket.on("typing_stop", (data) => {
      const { chatId } = data;
      socket.to(`chat_${chatId}`).emit("user_stopped_typing", {
        userId,
        userName: socket.userData.doctorName,
        chatId,
      });
    });

    // Handle user status updates
    socket.on("update_status", (data) => {
      const { status } = data; // online, away, busy, offline

      if (activeUsers.has(userId)) {
        const userInfo = activeUsers.get(userId);
        userInfo.status = status;
        userInfo.lastSeen = new Date();
        activeUsers.set(userId, userInfo);

        // Emit status update to contacts
        emitUserStatusToContacts(socket, userId, status);
      }
    });

    // Handle getting online users
    socket.on("get_online_users", () => {
      const onlineUsersList = Array.from(activeUsers.entries()).map(
        ([id, info]) => ({
          userId: id,
          userData: info.userData,
          status: info.status || "online",
          lastSeen: info.lastSeen,
        })
      );

      socket.emit("online_users", onlineUsersList);
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log(
        `Doctor ${socket.userData.doctorName} disconnected: ${socket.id}`
      );

      // Update user status to offline
      if (activeUsers.has(userId)) {
        const userInfo = activeUsers.get(userId);
        userInfo.lastSeen = new Date();
        activeUsers.set(userId, userInfo);

        // Emit offline status to contacts
        emitUserStatusToContacts(socket, userId, "offline");

        // Remove from active users after a delay (in case of reconnection)
        setTimeout(() => {
          if (activeUsers.get(userId)?.socketId === socket.id) {
            activeUsers.delete(userId);
          }
        }, 30000); // 30 seconds delay
      }

      userSockets.delete(socket.id);
    });

    // Handle errors
    socket.on("error", (error) => {
      console.error("Socket error:", error);
    });
  });
};

// Helper function to emit user status to their contacts
const emitUserStatusToContacts = async (socket, userId, status) => {
  try {
    // Get user's chats to find their contacts
    const userChats = await Chat.find({
      participants: userId,
      isActive: true,
    }).populate("participants", "_id");

    // Get all unique contact IDs
    const contactIds = new Set();
    userChats.forEach((chat) => {
      chat.participants.forEach((participant) => {
        if (!participant._id.equals(userId)) {
          contactIds.add(participant._id.toString());
        }
      });
    });

    // Emit status update to online contacts
    contactIds.forEach((contactId) => {
      if (activeUsers.has(contactId)) {
        const contactSocketId = activeUsers.get(contactId).socketId;
        socket.to(contactSocketId).emit("contact_status_update", {
          userId,
          userName: socket.userData.doctorName,
          status,
          lastSeen: new Date(),
        });
      }
    });
  } catch (error) {
    console.error("Error emitting user status:", error);
  }
};

// Helper function for push notifications (implement based on your notification service)
const sendPushNotifications = async (userIds, notificationData) => {
  try {
    // Get FCM tokens for offline users
    const users = await hospitalDoctor
      .find({
        _id: { $in: userIds },
        fcmToken: { $exists: true, $ne: "" },
      })
      .select("fcmToken doctorName");

    // Implement your push notification logic here
    // Example with FCM:
    /*
    const admin = require('firebase-admin');
    const tokens = users.map(user => user.fcmToken);
    
    if (tokens.length > 0) {
      await admin.messaging().sendMulticast({
        tokens,
        notification: {
          title: notificationData.title,
          body: notificationData.body,
        },
        data: {
          chatId: notificationData.chatId,
          type: 'chat_message',
        },
      });
    }
    */

    console.log(
      `Would send push notification to ${users.length} offline users`
    );
  } catch (error) {
    console.error("Error sending push notifications:", error);
  }
};

// Export helper functions for external use
export const getActiveUsers = () => Array.from(activeUsers.entries());
export const isUserOnline = (userId) => activeUsers.has(userId);
export const getUserSocket = (userId) => activeUsers.get(userId)?.socketId;
