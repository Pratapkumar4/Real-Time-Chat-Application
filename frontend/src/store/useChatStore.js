import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  searchResults: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  isSearching: false,
  unreadCounts: {},

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load friends");
    } finally {
      set({ isUsersLoading: false });
    }
  },
  
  pinChat: async (userId) => {
    try {
      await axiosInstance.post("/messages/pin-chat", { userId });
      // Refresh the users list to update the pinned status
      get().getUsers();
      toast.success("Chat pinned successfully");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to pin chat");
      return false;
    }
  },
  
  unpinChat: async (userId) => {
    try {
      await axiosInstance.post("/messages/unpin-chat", { userId });
      // Refresh the users list to update the pinned status
      get().getUsers();
      toast.success("Chat unpinned successfully");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to unpin chat");
      return false;
    }
  },

  searchUsers: async (email) => {
    if (!email) {
      set({ searchResults: [] });
      return;
    }
    
    set({ isSearching: true });
    try {
      const res = await axiosInstance.get(`/messages/search?email=${email}`);
      set({ searchResults: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Search failed");
    } finally {
      set({ isSearching: false });
    }
  },

  addFriend: async (userId) => {
    try {
      const res = await axiosInstance.post("/messages/add-friend", { userId });
      
      // If we got a user object back, it means the request was auto-accepted
      if (res.data.fullName) {
        // Update the users list with the new friend
        set({ 
          users: [...get().users, res.data],
          searchResults: get().searchResults.filter(user => user._id !== userId)
        });
        toast.success("Friend added successfully");
      } else {
        // Otherwise, it was just a request sent
        set({ 
          searchResults: get().searchResults.filter(user => user._id !== userId)
        });
        toast.success("Friend request sent");
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to add friend");
    }
  },
  
  acceptFriendRequest: async (userId) => {
    try {
      await axiosInstance.post("/messages/accept-friend-request", { userId });
      // Refresh the users list to include the new friend
      get().getUsers();
      return true;
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to accept friend request");
      return false;
    }
  },
  
  declineFriendRequest: async (userId) => {
    try {
      await axiosInstance.post("/messages/decline-friend-request", { userId });
      return true;
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to decline friend request");
      return false;
    }
  },
  
  removeFriend: async (userId) => {
    try {
      await axiosInstance.post("/messages/remove-friend", { userId });
      // Update the users list by removing the friend
      set({ 
        users: get().users.filter(user => user._id !== userId),
        // If the removed friend was the selected user, clear the selection
        selectedUser: get().selectedUser?._id === userId ? null : get().selectedUser
      });
      toast.success("Friend removed successfully");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to remove friend");
      return false;
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },
  
  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      set({ messages: [...messages, res.data] });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  },

  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;

    socket.on("newMessage", (newMessage) => {
      const authUserId = useAuthStore.getState().authUser._id;
      const { selectedUser } = get();
      
      // If the message is from someone else to me
      if (newMessage.senderId !== authUserId && newMessage.receiverId === authUserId) {
        // Check if this is from the currently selected user
        const isFromSelectedUser = selectedUser && newMessage.senderId === selectedUser._id;
        
        if (isFromSelectedUser) {
          // Add to current chat messages if we're viewing that chat
          set({
            messages: [...get().messages, newMessage],
          });
        } else {
          // Increment unread count for this sender
          set(state => ({
            unreadCounts: {
              ...state.unreadCounts,
              [newMessage.senderId]: (state.unreadCounts[newMessage.senderId] || 0) + 1
            }
          }));
        }
        
        // Refresh the users list to update last interaction times
        get().getUsers();
      } else if (newMessage.senderId === authUserId) {
        // If I sent the message, add it to the current chat
        if (selectedUser && newMessage.receiverId === selectedUser._id) {
          set({
            messages: [...get().messages, newMessage],
          });
          
          // Refresh the users list to update last interaction times
          get().getUsers();
        }
      }
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
  },
  
  subscribeToFriendEvents: () => {
    const socket = useAuthStore.getState().socket;
    
    // Listen for friend request accepted events
    socket.on("friendRequestAccepted", () => {
      // Refresh the users list when a friend request is accepted
      get().getUsers();
    });
    
    return () => {
      socket.off("friendRequestAccepted");
    };
  },

  setSelectedUser: (selectedUser) => {
    // Clear unread count for this user when selected
    if (selectedUser) {
      set(state => {
        // Create a new unreadCounts object with the selected user's count reset to 0
        const updatedUnreadCounts = {
          ...state.unreadCounts,
          [selectedUser._id]: 0
        };
        
        return {
          selectedUser,
          unreadCounts: updatedUnreadCounts
        };
      });
    } else {
      set({ selectedUser });
    }
  },
  clearSearchResults: () => set({ searchResults: [] }),
}));
