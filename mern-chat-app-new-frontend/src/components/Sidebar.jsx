import { useEffect, useState, useRef } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Pin, PinOff, Plus, Search, Users, UserPlus, UserX, X } from "lucide-react";

const Sidebar = () => {
  const { 
    getUsers, 
    users, 
    selectedUser, 
    setSelectedUser, 
    isUsersLoading,
    searchUsers,
    searchResults,
    isSearching,
    addFriend,
    removeFriend,
    pinChat,
    unpinChat,
    subscribeToFriendEvents,
    clearSearchResults,
    unreadCounts
  } = useChatStore();

  const { onlineUsers } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchMode, setSearchMode] = useState("friends"); // "friends" or "new"
  const searchInputRef = useRef(null);

  useEffect(() => {
    getUsers();
    
    // Subscribe to friend events for real-time updates
    const unsubscribe = subscribeToFriendEvents();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [getUsers, subscribeToFriendEvents]);

  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (searchMode === "friends") {
      // Filter existing friends locally
      if (!value.trim()) {
        clearSearchResults();
      }
    } else {
      // Search for new users via API
      searchUsers(value);
    }
  };

  const handleAddFriend = (userId) => {
    addFriend(userId);
  };

  const toggleSearch = (mode = "friends") => {
    const newShowSearch = !showSearch || searchMode !== mode;
    setShowSearch(newShowSearch);
    setSearchMode(mode);
    
    if (!newShowSearch) {
      setSearchTerm("");
      clearSearchResults();
    }
  };

  // Filter users based on search term when in friends mode
  const filteredUsers = () => {
    let filtered = showOnlineOnly
      ? users.filter((user) => onlineUsers.includes(user._id))
      : users;
    
    // If searching in friends mode, filter by search term
    if (showSearch && searchMode === "friends" && searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        user.fullName.toLowerCase().includes(term) || 
        user.email.toLowerCase().includes(term)
      );
    }
    
    return filtered;
  };

  if (isUsersLoading) return <SidebarSkeleton />;

  return (
    <aside className="h-full w-20 lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200">
      <div className="border-b border-base-300 w-full p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="size-6" />
            <span className="font-medium hidden lg:block">Friends</span>
          </div>
          <div className="flex items-center gap-1">
            {/* Search existing friends button */}
            <button 
              onClick={() => toggleSearch("friends")}
              className={`btn btn-sm btn-circle ${showSearch && searchMode === "friends" ? "btn-primary" : "btn-ghost"}`}
              title={showSearch && searchMode === "friends" ? "Close search" : "Search your friends"}
            >
              {showSearch && searchMode === "friends" ? <X className="size-5" /> : <Search className="size-5" />}
            </button>
            
            {/* Find new friends button */}
            <button 
              onClick={() => toggleSearch("new")}
              className={`btn btn-sm btn-circle ${showSearch && searchMode === "new" ? "btn-primary" : "btn-ghost"}`}
              title={showSearch && searchMode === "new" ? "Close search" : "Find new friends"}
            >
              {showSearch && searchMode === "new" ? <X className="size-5" /> : <Plus className="size-5" />}
            </button>
          </div>
        </div>
        
        {/* Search bar */}
        {showSearch && (
          <div className="mt-3">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                placeholder={searchMode === "friends" ? "Search your friends..." : "Search by email for new friends..."}
                className="input input-sm input-bordered w-full pr-8"
                value={searchTerm}
                onChange={handleSearch}
              />
              {searchTerm && (
                <button 
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => {
                    setSearchTerm("");
                    clearSearchResults();
                  }}
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            
            {/* Search results for new friends */}
            {searchMode === "new" && searchTerm && (
              <div className="mt-2 bg-base-200 rounded-md max-h-60 overflow-y-auto">
                {isSearching ? (
                  <div className="p-3 text-center text-sm">Searching...</div>
                ) : searchResults.length > 0 ? (
                  searchResults.map(user => (
                    <div key={user._id} className="p-2 hover:bg-base-300 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img 
                          src={user.profilePic || "/avatar.png"} 
                          alt={user.fullName} 
                          className="size-8 rounded-full"
                        />
                        <div>
                          <div className="font-medium text-sm">{user.fullName}</div>
                          <div className="text-xs text-base-content/70">{user.email}</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleAddFriend(user._id)}
                        className="btn btn-xs btn-ghost"
                        title="Add as friend"
                      >
                        <UserPlus className="size-4" />
                      </button>
                    </div>
                  ))
                ) : searchTerm ? (
                  <div className="p-3 text-center text-sm">No users found</div>
                ) : null}
              </div>
            )}
          </div>
        )}
        
        {/* Online filter toggle */}
        {!showSearch && (
          <div className="mt-3 hidden lg:flex items-center gap-2">
            <label className="cursor-pointer flex items-center gap-2">
              <input
                type="checkbox"
                checked={showOnlineOnly}
                onChange={(e) => setShowOnlineOnly(e.target.checked)}
                className="checkbox checkbox-sm"
              />
              <span className="text-sm">Show online only</span>
            </label>
            {/* <span className="text-xs text-zinc-500">({onlineUsers.length - 1} online)</span> */}
          </div>
        )}
      </div>

      <div className="overflow-y-auto w-full py-3">
        {filteredUsers().length > 0 ? (
          filteredUsers().map((user) => (
            <button
              key={user._id}
              onClick={() => setSelectedUser(user)}
              className={`
                w-full p-3 flex items-center gap-3
                hover:bg-base-300 transition-colors
                ${selectedUser?._id === user._id ? "bg-base-300 ring-1 ring-base-300" : ""}
              `}
            >
              <div className="relative mx-auto lg:mx-0">
                <img
                  src={user.profilePic || "/avatar.png"}
                  alt={user.name}
                  className="size-12 object-cover rounded-full"
                />
                {onlineUsers.includes(user._id) && (
                  <span
                    className="absolute bottom-0 right-0 size-3 bg-green-500 
                    rounded-full ring-2 ring-zinc-900"
                  />
                )}
                {unreadCounts && unreadCounts[user._id] > 0 && (
                  <span className="absolute -top-1 -right-1 size-5 bg-primary text-white text-xs
                    rounded-full flex items-center justify-center font-bold ring-2 ring-base-100">
                    {unreadCounts[user._id]}
                  </span>
                )}
              </div>

              {/* User info - only visible on larger screens */}
              <div className="hidden lg:block text-left min-w-0 flex-1">
                <div className="font-medium truncate">
                  {user.isPinned && <span className="inline-block mr-1 text-primary">📌</span>}
                  {user.fullName}
                </div>
                <div className="text-sm text-zinc-400">
                  {onlineUsers.includes(user._id) ? "Online" : "Offline"}
                </div>
              </div>
              
              {/* Pin/Unpin button - only visible on larger screens */}
              <div className="hidden lg:block">
                {user.isPinned ? (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      unpinChat(user._id);
                    }}
                    className="btn btn-xs btn-ghost"
                    title="Unpin chat"
                  >
                    <PinOff className="size-4" />
                  </button>
                ) : (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      pinChat(user._id);
                    }}
                    className="btn btn-xs btn-ghost"
                    title="Pin chat"
                  >
                    <Pin className="size-4" />
                  </button>
                )}
              </div>
            </button>
          ))
        ) : (
          <div className="text-center text-zinc-500 py-4">
            {showSearch && searchMode === "friends" && searchTerm
              ? "No matching friends found"
              : showOnlineOnly 
                ? "No online friends" 
                : "No friends yet. Use the + button to find users."}
          </div>
        )}
      </div>
      
      {/* Floating action button for mobile */}
      <div className="lg:hidden fixed bottom-20 right-4 z-10">
        <button 
          onClick={() => toggleSearch("new")}
          className="btn btn-circle btn-primary shadow-lg"
          title="Find new friends"
        >
          <Plus className="size-6" />
        </button>
      </div>
    </aside>
  );
};
export default Sidebar;
