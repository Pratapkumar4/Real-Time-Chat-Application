import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { 
  getMessages, 
  getUsersForSidebar, 
  sendMessage, 
  searchUsers,
  addFriend,
  acceptFriendRequest,
  declineFriendRequest,
  getNotifications,
  markNotificationsAsRead,
  removeFriend,
  pinChat,
  unpinChat
} from "../controllers/message.controller.js";

const router = express.Router();

router.get("/users", protectRoute, getUsersForSidebar);
router.get("/search", protectRoute, searchUsers);
router.get("/notifications", protectRoute, getNotifications);
router.get("/:id", protectRoute, getMessages);

router.post("/send/:id", protectRoute, sendMessage);
router.post("/add-friend", protectRoute, addFriend);
router.post("/accept-friend-request", protectRoute, acceptFriendRequest);
router.post("/decline-friend-request", protectRoute, declineFriendRequest);
router.post("/mark-notifications-read", protectRoute, markNotificationsAsRead);
router.post("/remove-friend", protectRoute, removeFriend);
router.post("/pin-chat", protectRoute, pinChat);
router.post("/unpin-chat", protectRoute, unpinChat);

export default router;
