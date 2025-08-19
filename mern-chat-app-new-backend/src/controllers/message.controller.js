import User from "../models/user.model.js";
import Message from "../models/message.model.js";

import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    
    // Get the user with populated friends and pinned chats
    const currentUser = await User.findById(loggedInUserId)
      .populate({
        path: "friends",
        select: "-password",
      })
      .populate({
        path: "pinnedChats",
        select: "-password",
      });

    if (!currentUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Create a map of friends with their last interaction time
    const friendsWithMetadata = currentUser.friends.map(friend => {
      const lastInteractionTime = currentUser.lastInteractions.get(friend._id.toString()) || new Date(0);
      const isPinned = currentUser.pinnedChats.some(pinnedUser => 
        pinnedUser._id.toString() === friend._id.toString()
      );
      
      return {
        ...friend.toObject(),
        lastInteractionTime,
        isPinned
      };
    });

    // Sort friends: pinned first, then by last interaction time
    const sortedFriends = friendsWithMetadata.sort((a, b) => {
      // Pinned chats always come first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      
      // Then sort by last interaction time (most recent first)
      return new Date(b.lastInteractionTime) - new Date(a.lastInteractionTime);
    });

    res.status(200).json(sortedFriends || []);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const searchUsers = async (req, res) => {
  try {
    const { email } = req.query;
    const loggedInUserId = req.user._id;

    if (!email) {
      return res.status(400).json({ error: "Email is required for search" });
    }

    // Find users whose email contains the search term (case insensitive)
    const users = await User.find({
      email: { $regex: email, $options: "i" },
      _id: { $ne: loggedInUserId }, // Exclude the logged-in user
    }).select("-password");

    res.status(200).json(users);
  } catch (error) {
    console.error("Error in searchUsers: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const addFriend = async (req, res) => {
  try {
    const { userId } = req.body;
    const loggedInUserId = req.user._id;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Check if the user exists
    const userToAdd = await User.findById(userId);
    if (!userToAdd) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if users are already friends
    const currentUser = await User.findById(loggedInUserId);
    if (currentUser.friends.includes(userId)) {
      return res.status(400).json({ error: "User is already a friend" });
    }

    // Check if a friend request already exists
    const existingRequest = userToAdd.friendRequests.find(
      (request) => request.from.toString() === loggedInUserId.toString()
    );
    if (existingRequest) {
      return res.status(400).json({ error: "Friend request already sent" });
    }

    // Check if the other user has already sent a request
    const existingRequestToMe = currentUser.friendRequests.find(
      (request) => request.from.toString() === userId.toString()
    );
    if (existingRequestToMe) {
      // Auto-accept the request if the other user has already sent one
      await User.findByIdAndUpdate(loggedInUserId, { 
        $pull: { friendRequests: { from: userId } },
        $push: { 
          friends: userId,
          notifications: {
            type: "friend_accepted",
            from: userId
          }
        }
      });
      
      await User.findByIdAndUpdate(userId, { 
        $push: { 
          friends: loggedInUserId,
          notifications: {
            type: "friend_accepted",
            from: loggedInUserId
          }
        }
      });

      // Get the updated user
      const updatedUser = await User.findById(userId).select("-password");
      
      // Notify the other user via socket
      const receiverSocketId = getReceiverSocketId(userId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("friendRequestAccepted", {
          user: currentUser
        });
      }

      return res.status(200).json(updatedUser);
    }

    // Create a friend request
    await User.findByIdAndUpdate(userId, { 
      $push: { 
        friendRequests: { from: loggedInUserId },
        notifications: {
          type: "friend_request",
          from: loggedInUserId
        }
      }
    });

    // Notify the user via socket
    const receiverSocketId = getReceiverSocketId(userId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newFriendRequest", {
        user: currentUser
      });
    }

    res.status(200).json({ message: "Friend request sent successfully" });
  } catch (error) {
    console.error("Error in addFriend: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const acceptFriendRequest = async (req, res) => {
  try {
    const { userId } = req.body;
    const loggedInUserId = req.user._id;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Check if the request exists
    const currentUser = await User.findById(loggedInUserId);
    const requestExists = currentUser.friendRequests.find(
      (request) => request.from.toString() === userId.toString()
    );

    if (!requestExists) {
      return res.status(404).json({ error: "Friend request not found" });
    }

    // Add each other as friends and remove the request
    await User.findByIdAndUpdate(loggedInUserId, {
      $pull: { friendRequests: { from: userId } },
      $push: { friends: userId }
    });

    // Add notification for the user who sent the request
    await User.findByIdAndUpdate(userId, {
      $push: { 
        friends: loggedInUserId,
        notifications: {
          type: "friend_accepted",
          from: loggedInUserId
        }
      }
    });

    // Notify the user via socket
    const receiverSocketId = getReceiverSocketId(userId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("friendRequestAccepted", {
        userId: loggedInUserId
      });
    }

    res.status(200).json({ message: "Friend request accepted" });
  } catch (error) {
    console.error("Error in acceptFriendRequest: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const declineFriendRequest = async (req, res) => {
  try {
    const { userId } = req.body;
    const loggedInUserId = req.user._id;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Check if the request exists
    const currentUser = await User.findById(loggedInUserId);
    const requestExists = currentUser.friendRequests.find(
      (request) => request.from.toString() === userId.toString()
    );

    if (!requestExists) {
      return res.status(404).json({ error: "Friend request not found" });
    }

    // Remove the request
    await User.findByIdAndUpdate(loggedInUserId, {
      $pull: { friendRequests: { from: userId } }
    });

    res.status(200).json({ message: "Friend request declined" });
  } catch (error) {
    console.error("Error in declineFriendRequest: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getNotifications = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    // Get the user with populated notifications
    const user = await User.findById(loggedInUserId)
      .populate({
        path: "notifications.from",
        select: "fullName profilePic email"
      })
      .select("notifications friendRequests");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Also populate friend requests
    const populatedUser = await User.populate(user, {
      path: "friendRequests.from",
      select: "fullName profilePic email"
    });

    res.status(200).json({
      notifications: populatedUser.notifications,
      friendRequests: populatedUser.friendRequests
    });
  } catch (error) {
    console.error("Error in getNotifications: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const markNotificationsAsRead = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    await User.updateMany(
      { _id: loggedInUserId, "notifications.read": false },
      { $set: { "notifications.$[elem].read": true } },
      { arrayFilters: [{ "elem.read": false }] }
    );

    res.status(200).json({ message: "Notifications marked as read" });
  } catch (error) {
    console.error("Error in markNotificationsAsRead: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const removeFriend = async (req, res) => {
  try {
    const { userId } = req.body;
    const loggedInUserId = req.user._id;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Check if users are actually friends
    const currentUser = await User.findById(loggedInUserId);
    if (!currentUser.friends.includes(userId)) {
      return res.status(400).json({ error: "User is not in your friends list" });
    }

    // Remove from each other's friends list
    await User.findByIdAndUpdate(loggedInUserId, {
      $pull: { friends: userId }
    });

    await User.findByIdAndUpdate(userId, {
      $pull: { friends: loggedInUserId }
    });

    res.status(200).json({ message: "Friend removed successfully" });
  } catch (error) {
    console.error("Error in removeFriend: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Keep the existing functions
export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    });

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const pinChat = async (req, res) => {
  try {
    const { userId } = req.body;
    const loggedInUserId = req.user._id;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Check if the user exists and is a friend
    const currentUser = await User.findById(loggedInUserId);
    if (!currentUser.friends.includes(userId)) {
      return res.status(400).json({ error: "User is not in your friends list" });
    }

    // Check if already pinned
    if (currentUser.pinnedChats.includes(userId)) {
      return res.status(400).json({ error: "Chat is already pinned" });
    }

    // Check if pinned chats limit reached
    if (currentUser.pinnedChats.length >= 2) {
      return res.status(400).json({ error: "You can only pin up to 2 chats" });
    }

    // Add to pinned chats
    await User.findByIdAndUpdate(loggedInUserId, {
      $push: { pinnedChats: userId }
    });

    res.status(200).json({ message: "Chat pinned successfully" });
  } catch (error) {
    console.error("Error in pinChat: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const unpinChat = async (req, res) => {
  try {
    const { userId } = req.body;
    const loggedInUserId = req.user._id;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Remove from pinned chats
    await User.findByIdAndUpdate(loggedInUserId, {
      $pull: { pinnedChats: userId }
    });

    res.status(200).json({ message: "Chat unpinned successfully" });
  } catch (error) {
    console.error("Error in unpinChat: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateLastInteraction = async (senderId, receiverId) => {
  try {
    const currentTime = new Date();
    
    // Update last interaction for sender
    await User.findByIdAndUpdate(senderId, {
      $set: { [`lastInteractions.${receiverId}`]: currentTime }
    });
    
    // Update last interaction for receiver
    await User.findByIdAndUpdate(receiverId, {
      $set: { [`lastInteractions.${senderId}`]: currentTime }
    });
  } catch (error) {
    console.error("Error in updateLastInteraction: ", error.message);
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, file } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let fileData = null;
    if (file) {
      // Upload base64 file to cloudinary
      const uploadResponse = await cloudinary.uploader.upload(file.data, {
        resource_type: "auto", // auto-detect file type
        folder: "chat_app_files",
      });
      
      fileData = {
        url: uploadResponse.secure_url,
        type: file.type,
        name: file.name,
        size: file.size,
      };
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      file: fileData,
    });

    await newMessage.save();

    // Update last interaction timestamp for both users
    await updateLastInteraction(senderId, receiverId);
    
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
