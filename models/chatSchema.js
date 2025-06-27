import mongoose from "mongoose";

// Message schema for individual chat messages
const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "hospitalDoctor",
    required: true,
  },
  senderName: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
    trim: true,
  },
  messageType: {
    type: String,
    enum: ["text", "image", "file", "voice"],
    default: "text",
  },
  fileUrl: {
    type: String, // For storing file/image URLs if messageType is not text
  },
  fileName: {
    type: String, // Original filename for file messages
  },
  isEdited: {
    type: Boolean,
    default: false,
  },
  editedAt: {
    type: Date,
  },
  readBy: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "hospitalDoctor",
      },
      readAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Chat room schema for 1v1 conversations
const chatSchema = new mongoose.Schema({
  participants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "hospitalDoctor",
      required: true,
    },
  ],
  participantNames: [
    {
      type: String,
      required: true,
    },
  ],
  lastMessage: {
    content: String,
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "hospitalDoctor",
    },
    senderName: String,
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  messages: [messageSchema],
  isActive: {
    type: Boolean,
    default: true,
  },
  unreadCount: {
    type: Map,
    of: Number,
    default: {},
  },
  chatType: {
    type: String,
    enum: ["direct", "group"], // For future group chat expansion
    default: "direct",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes for better performance
chatSchema.index({ participants: 1 });
chatSchema.index({ "lastMessage.timestamp": -1 });
chatSchema.index({ "messages.createdAt": -1 });
chatSchema.index({ isActive: 1 });

// Virtual to get chat partner for a specific user
chatSchema.methods.getChatPartner = function (userId) {
  return this.participants.find((id) => !id.equals(userId));
};

// Method to add a new message
chatSchema.methods.addMessage = function (messageData) {
  this.messages.push(messageData);
  this.lastMessage = {
    content: messageData.content,
    senderId: messageData.senderId,
    senderName: messageData.senderName,
    timestamp: messageData.createdAt || new Date(),
  };
  this.updatedAt = new Date();

  // Update unread count for participants except sender
  this.participants.forEach((participantId) => {
    if (!participantId.equals(messageData.senderId)) {
      const currentCount = this.unreadCount.get(participantId.toString()) || 0;
      this.unreadCount.set(participantId.toString(), currentCount + 1);
    }
  });

  return this.save();
};

// Method to mark messages as read
chatSchema.methods.markAsRead = function (userId) {
  this.unreadCount.set(userId.toString(), 0);

  // Add read receipt to recent messages
  const unreadMessages = this.messages.filter(
    (msg) => !msg.readBy.some((read) => read.userId.equals(userId))
  );

  unreadMessages.forEach((msg) => {
    msg.readBy.push({ userId, readAt: new Date() });
  });

  this.updatedAt = new Date();
  return this.save();
};

// Static method to find or create chat between two users
chatSchema.statics.findOrCreateChat = async function (
  user1Id,
  user2Id,
  user1Name,
  user2Name
) {
  // Check if chat already exists
  let chat = await this.findOne({
    participants: { $all: [user1Id, user2Id], $size: 2 },
    chatType: "direct",
  }).populate("participants", "doctorName email speciality");

  if (!chat) {
    // Create new chat
    chat = new this({
      participants: [user1Id, user2Id],
      participantNames: [user1Name, user2Name],
      unreadCount: new Map([
        [user1Id.toString(), 0],
        [user2Id.toString(), 0],
      ]),
    });
    await chat.save();
    await chat.populate("participants", "doctorName email speciality");
  }

  return chat;
};

// Static method to get user's chat list
chatSchema.statics.getUserChats = function (userId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  return this.find({
    participants: userId,
    isActive: true,
  })
    .populate("participants", "doctorName email speciality imageUrl")
    .sort({ "lastMessage.timestamp": -1 })
    .skip(skip)
    .limit(limit);
};

const Chat = mongoose.model("Chat", chatSchema);
export default Chat;
