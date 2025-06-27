import mongoose from "mongoose";
import hospitalDoctors from "../models/hospitalDoctorSchema.js";
import Chat from "../models/chatSchema.js";

// Get or create a chat between two doctors
export const getOrCreateChat = async (req, res) => {
  try {
    const { recipientId } = req.params;
    const senderId = req.userId;

    // Validate recipient exists
    const recipient = await hospitalDoctors.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: "Recipient doctor not found",
      });
    }

    // Get sender info
    const sender = await hospitalDoctors.findById(senderId);
    if (!sender) {
      return res.status(404).json({
        success: false,
        message: "Sender not found",
      });
    }

    // Prevent self-chat
    if (senderId === recipientId) {
      return res.status(400).json({
        success: false,
        message: "Cannot create chat with yourself",
      });
    }

    const chat = await Chat.findOrCreateChat(
      senderId,
      recipientId,
      sender.doctorName,
      recipient.doctorName
    );

    res.status(200).json({
      success: true,
      data: chat,
      message: "Chat retrieved successfully",
    });
  } catch (error) {
    console.error("Error in getOrCreateChat:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get user's chat list
export const getUserChats = async (req, res) => {
  try {
    const userId = req.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const chats = await Chat.getUserChats(userId, page, limit);

    // Format response to include chat partner info
    const formattedChats = chats.map((chat) => {
      const partner = chat.participants.find((p) => !p._id.equals(userId));
      return {
        _id: chat._id,
        partner: {
          _id: partner._id,
          doctorName: partner.doctorName,
          email: partner.email,
          speciality: partner.speciality,
          imageUrl: partner.imageUrl,
        },
        lastMessage: chat.lastMessage,
        unreadCount: chat.unreadCount.get(userId.toString()) || 0,
        updatedAt: chat.updatedAt,
      };
    });

    res.status(200).json({
      success: true,
      data: formattedChats,
      pagination: {
        page,
        limit,
        total: formattedChats.length,
      },
      message: "Chats retrieved successfully",
    });
  } catch (error) {
    console.error("Error in getUserChats:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get chat messages with pagination
export const getChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    // Validate chat ID
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid chat ID",
      });
    }

    // Find chat and verify user is participant
    const chat = await Chat.findById(chatId).populate(
      "participants",
      "doctorName email speciality imageUrl"
    );

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found",
      });
    }

    // Check if user is participant
    if (!chat.participants.some((p) => p._id.equals(userId))) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Get paginated messages (newest first)
    const totalMessages = chat.messages.length;
    const startIndex = Math.max(0, totalMessages - page * limit);
    const endIndex = totalMessages - (page - 1) * limit;

    const messages = chat.messages.slice(startIndex, endIndex).reverse(); // Reverse to get newest first

    // Mark messages as read
    await chat.markAsRead(userId);

    res.status(200).json({
      success: true,
      data: {
        chatId: chat._id,
        participants: chat.participants,
        messages,
        pagination: {
          page,
          limit,
          total: totalMessages,
          hasMore: startIndex > 0,
        },
      },
      message: "Messages retrieved successfully",
    });
  } catch (error) {
    console.error("Error in getChatMessages:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Send a message
export const sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content, messageType = "text", fileUrl, fileName } = req.body;
    const senderId = req.userId;

    // Validate input
    if (!content || content.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Message content is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid chat ID",
      });
    }

    // Find chat and verify user is participant
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found",
      });
    }

    if (!chat.participants.some((p) => p.equals(senderId))) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Get sender info
    const sender = await hospitalDoctor.findById(senderId);
    if (!sender) {
      return res.status(404).json({
        success: false,
        message: "Sender not found",
      });
    }

    // Create message data
    const messageData = {
      senderId,
      senderName: sender.doctorName,
      content: content.trim(),
      messageType,
      fileUrl,
      fileName,
      readBy: [{ userId: senderId, readAt: new Date() }], // Mark as read by sender
    };

    // Add message to chat
    await chat.addMessage(messageData);

    // Get the newly added message
    const newMessage = chat.messages[chat.messages.length - 1];

    res.status(201).json({
      success: true,
      data: newMessage,
      message: "Message sent successfully",
    });
  } catch (error) {
    console.error("Error in sendMessage:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Mark chat as read
export const markChatAsRead = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid chat ID",
      });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found",
      });
    }

    if (!chat.participants.some((p) => p.equals(userId))) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    await chat.markAsRead(userId);

    res.status(200).json({
      success: true,
      message: "Chat marked as read",
    });
  } catch (error) {
    console.error("Error in markChatAsRead:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Search doctors for new chat
export const searchDoctors = async (req, res) => {
  try {
    const { query } = req.query;
    const userId = req.userId;

    if (!query || query.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    // Search doctors by name, email, or speciality
    const doctors = await hospitalDoctors
      .find({
        _id: { $ne: userId }, // Exclude current user
        $or: [
          { doctorName: { $regex: query, $options: "i" } },
          { email: { $regex: query, $options: "i" } },
          { speciality: { $regex: query, $options: "i" } },
          { department: { $regex: query, $options: "i" } },
        ],
      })
      .select("doctorName email speciality department imageUrl")
      .limit(10);

    res.status(200).json({
      success: true,
      data: doctors,
      message: "Doctors found successfully",
    });
  } catch (error) {
    console.error("Error in searchDoctors:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Delete a message (soft delete)
export const deleteMessage = async (req, res) => {
  try {
    const { chatId, messageId } = req.params;
    const userId = req.userId;

    if (
      !mongoose.Types.ObjectId.isValid(chatId) ||
      !mongoose.Types.ObjectId.isValid(messageId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid chat ID or message ID",
      });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found",
      });
    }

    if (!chat.participants.some((p) => p.equals(userId))) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const message = chat.messages.id(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    // Only allow sender to delete their own messages
    if (!message.senderId.equals(userId)) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own messages",
      });
    }

    // Soft delete by updating content
    message.content = "This message was deleted";
    message.messageType = "deleted";
    message.isEdited = true;
    message.editedAt = new Date();

    chat.updatedAt = new Date();
    await chat.save();

    res.status(200).json({
      success: true,
      message: "Message deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteMessage:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get unread message count for user
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.userId;

    const chats = await Chat.find({
      participants: userId,
      isActive: true,
    });

    const totalUnread = chats.reduce((total, chat) => {
      return total + (chat.unreadCount.get(userId.toString()) || 0);
    }, 0);

    res.status(200).json({
      success: true,
      data: {
        totalUnread,
        chatCounts: chats.map((chat) => ({
          chatId: chat._id,
          unread: chat.unreadCount.get(userId.toString()) || 0,
        })),
      },
      message: "Unread count retrieved successfully",
    });
  } catch (error) {
    console.error("Error in getUnreadCount:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
