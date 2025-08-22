import { UserMinus, X } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useState } from "react";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser, removeFriend } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const [showConfirmRemove, setShowConfirmRemove] = useState(false);
  
  const handleRemoveFriend = async () => {
    await removeFriend(selectedUser._id);
    setShowConfirmRemove(false);
  };

  return (
    <div className="p-2.5 border-b border-base-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="avatar">
            <div className="size-10 rounded-full relative">
              <img src={selectedUser.profilePic || "/avatar.png"} alt={selectedUser.fullName} />
            </div>
          </div>

          {/* User info */}
          <div>
            <h3 className="font-medium">{selectedUser.fullName}</h3>
            <div className="flex flex-col text-sm">
              <p className="text-base-content/70">
                {onlineUsers.includes(selectedUser._id) ? "Online" : "Offline"}
              </p>
              <p className="text-xs text-base-content/60">{selectedUser.email}</p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {/* Remove friend button */}
          <button 
            onClick={() => setShowConfirmRemove(true)}
            className="btn btn-sm btn-ghost btn-circle"
            title="Remove friend"
          >
            <UserMinus className="size-5" />
          </button>
          
          {/* Close button */}
          <button 
            onClick={() => setSelectedUser(null)}
            className="btn btn-sm btn-ghost btn-circle"
          >
            <X className="size-5" />
          </button>
        </div>
      </div>
      
      {/* Confirmation Modal */}
      <ConfirmRemoveModal 
        isOpen={showConfirmRemove}
        onClose={() => setShowConfirmRemove(false)}
        onConfirm={handleRemoveFriend}
        friendName={selectedUser.fullName}
      />
    </div>
  );
};
export default ChatHeader;

// Confirmation modal component
const ConfirmRemoveModal = ({ isOpen, onClose, onConfirm, friendName }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-base-100 rounded-lg p-6 max-w-sm w-full">
        <h3 className="font-bold text-lg mb-4">Remove Friend</h3>
        <p className="mb-6">Are you sure you want to remove <span className="font-medium">{friendName}</span> from your friends list?</p>
        <div className="flex justify-end gap-2">
          <button 
            onClick={onClose}
            className="btn btn-sm"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className="btn btn-sm btn-error"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
};
