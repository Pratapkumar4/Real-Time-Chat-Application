import { Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { Bell, LogOut, MessageSquare, Settings, User } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

const Navbar = () => {
  const { logout, authUser, socket } = useAuthStore();
  const [notifications, setNotifications] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (authUser) {
      fetchNotifications();
    }
  }, [authUser]);

  useEffect(() => {
    if (socket) {
      socket.on("newFriendRequest", ({ user }) => {
        toast.success(`New friend request from ${user.fullName}`);
        
        // Real-time update of friend requests
        setFriendRequests(prev => [
          ...prev, 
          { 
            _id: Date.now(), // Temporary ID until refresh
            from: user,
            createdAt: new Date()
          }
        ]);
        setUnreadCount(prev => prev + 1);
      });

      socket.on("friendRequestAccepted", ({ userId }) => {
        toast.success("Friend request accepted!");
        
        // Real-time update of notifications
        setNotifications(prev => [
          ...prev,
          {
            _id: Date.now(), // Temporary ID until refresh
            type: "friend_accepted",
            from: { _id: userId },
            read: false,
            createdAt: new Date()
          }
        ]);
        setUnreadCount(prev => prev + 1);
      });

      return () => {
        socket.off("newFriendRequest");
        socket.off("friendRequestAccepted");
      };
    }
  }, [socket]);

  const fetchNotifications = async () => {
    try {
      const res = await axiosInstance.get("/messages/notifications");
      setNotifications(res.data.notifications || []);
      setFriendRequests(res.data.friendRequests || []);
      
      // Count unread notifications
      const unreadNotifications = res.data.notifications.filter(n => !n.read).length;
      const pendingRequests = res.data.friendRequests.length;
      setUnreadCount(unreadNotifications + pendingRequests);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const handleAcceptFriendRequest = async (userId) => {
    try {
      await axiosInstance.post("/messages/accept-friend-request", { userId });
      toast.success("Friend request accepted!");
      fetchNotifications();
    } catch (error) {
      toast.error(error.response?.data?.error || "Something went wrong");
    }
  };

  const handleDeclineFriendRequest = async (userId) => {
    try {
      await axiosInstance.post("/messages/decline-friend-request", { userId });
      toast.success("Friend request declined");
      fetchNotifications();
    } catch (error) {
      toast.error(error.response?.data?.error || "Something went wrong");
    }
  };

  const markNotificationsAsRead = async () => {
    try {
      await axiosInstance.post("/messages/mark-notifications-read");
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(friendRequests.length);
    } catch (error) {
      console.error("Error marking notifications as read:", error);
    }
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications) {
      markNotificationsAsRead();
    }
  };
  
  // Handle click outside to close notifications
  const notificationRef = useRef(null);
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header
      className="bg-base-100 border-b border-base-300 fixed w-full top-0 z-40 
    backdrop-blur-lg bg-base-100/80"
    >
      <div className="container mx-auto px-4 h-16">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-all">
              <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-lg font-bold">Chatty</h1>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {authUser && (
              <div className="relative" ref={notificationRef}>
                <button 
                  className="btn btn-sm gap-2 transition-colors relative" 
                  onClick={toggleNotifications}
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full size-5 flex items-center justify-center text-xs">
                      {unreadCount}
                    </span>
                  )}
                </button>
                <div className="max-h-[300px] overflow-y-auto">

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-base-100 rounded-lg shadow-lg z-50 border border-base-300 max-h-96 overflow-y-auto">
                    <div className="p-3 border-b border-base-300">
                      <h3 className="font-semibold">Notifications</h3>
                    </div>
                    
                    {friendRequests.length > 0 && (
                      <div className="p-3 border-b border-base-300">
                        <h4 className="font-medium mb-2">Friend Requests</h4>
                        {friendRequests.map((request) => (
                          <div key={request._id} className="flex items-center justify-between mb-3 last:mb-0">
                            <div className="flex items-center gap-2">
                              <img 
                                src={request.from.profilePic || "/default-avatar.png"} 
                                alt={request.from.fullName} 
                                className="size-10 rounded-full object-cover"
                              />
                              <div>
                                <p className="font-medium">{request.from.fullName}</p>
                                <p className="text-xs opacity-70">Sent you a friend request</p>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <button 
                                className="btn btn-xs btn-success" 
                                onClick={() => handleAcceptFriendRequest(request.from._id)}
                              >
                                Accept
                              </button>
                              <button 
                                className="btn btn-xs btn-error" 
                                onClick={() => handleDeclineFriendRequest(request.from._id)}
                              >
                                Decline
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {notifications.length > 0 ? (
                      <div className="p-3">
                        {notifications.map((notification) => (
                          <div 
                            key={notification._id} 
                            className={`mb-3 last:mb-0 p-2 rounded-lg ${notification.read ? '' : 'bg-base-200'}`}
                          >
                            <div className="flex items-center gap-2">
                              <img 
                                src={notification.from.profilePic || "/default-avatar.png"} 
                                alt={notification.from.fullName} 
                                className="size-10 rounded-full object-cover"
                              />
                              <div>
                                <p className="font-medium">{notification.from.fullName}</p>
                                <p className="text-sm opacity-70">
                                  {notification.type === "friend_request" 
                                    ? "Sent you a friend request" 
                                    : "Accepted your friend request"}
                                </p>
                                <p className="text-xs opacity-50">
                                  {new Date(notification.createdAt).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-sm opacity-70">
                        {friendRequests.length > 0 ? "No other notifications" : "No notifications"}
                      </div>
                    )}
                  </div>
                )}
                </div>
              </div>
            )}

            <Link
              to={"/settings"}
              className={`
              btn btn-sm gap-2 transition-colors
              
              `}
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </Link>

            {authUser && (
              <>
                <Link to={"/profile"} className={`btn btn-sm gap-2`}>
                  <User className="size-5" />
                  <span className="hidden sm:inline">Profile</span>
                </Link>

                <button className="flex gap-2 items-center" onClick={logout}>
                  <LogOut className="size-5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
export default Navbar;
