import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import { Download, File, X } from "lucide-react";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    getMessages(selectedUser._id);
  }, [selectedUser._id, getMessages]);

  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleImageClick = (imageUrl) => {
    setPreviewImage(imageUrl);
  };

  const closeImagePreview = () => {
    setPreviewImage(null);
  };

  const downloadFile = (url, filename) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto relative">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message._id}
            className={`chat ${message.senderId === authUser._id ? "chat-end" : "chat-start"}`}
            ref={messageEndRef}
          >
            <div className=" chat-image avatar">
              <div className="size-10 rounded-full border">
                <img
                  src={
                    message.senderId === authUser._id
                      ? authUser.profilePic || "/avatar.png"
                      : selectedUser.profilePic || "/avatar.png"
                  }
                  alt="profile pic"
                />
              </div>
            </div>
            <div className="chat-header mb-1">
              <time className="text-xs opacity-50 ml-1">
                {formatMessageTime(message.createdAt)}
              </time>
            </div>
            <MessageBubble 
              message={message} 
              authUser={authUser} 
              handleImageClick={handleImageClick} 
              downloadFile={downloadFile} 
            />
          </div>
        ))}
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-[90vh] w-full">
            <button 
              onClick={closeImagePreview}
              className="absolute -top-12 right-0 btn btn-circle btn-sm"
            >
              <X size={20} />
            </button>
            <img 
              src={previewImage} 
              alt="Preview" 
              className="w-full h-full object-contain"
            />
            <button 
              onClick={() => downloadFile(previewImage, 'image.jpg')}
              className="absolute bottom-4 right-4 btn btn-circle"
            >
              <Download size={20} />
            </button>
          </div>
        </div>
      )}

      <MessageInput />
    </div>
  );
};

const MessageBubble = ({ message, authUser, handleImageClick, downloadFile }) => {
  const isSent = message.senderId === authUser._id;
  const bubbleClass = isSent ? "chat-end" : "chat-start";
  const bubbleColor = isSent ? "chat-bubble-primary" : "chat-bubble-secondary";
  
  const renderFileContent = () => {
    if (!message.file) return null;
    
    const { url, type, name } = message.file;
    
    if (type === 'image') {
      return (
        <div className="relative group cursor-pointer">
          <img
            src={url}
            alt="Attachment"
            className="sm:max-w-[200px] rounded-md mb-2"
            onClick={() => handleImageClick(url)}
          />
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                downloadFile(url, name || 'image.jpg');
              }}
              className="btn btn-circle btn-xs bg-base-200/80 hover:bg-base-300"
            >
              <Download size={12} />
            </button>
          </div>
        </div>
      );
    } else if (type === 'video') {
      return (
        <div className="relative group">
          <video 
            src={url} 
            controls 
            className="sm:max-w-[200px] rounded-md mb-2"
          />
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => downloadFile(url, name || 'video.mp4')}
              className="btn btn-circle btn-xs bg-base-200/80 hover:bg-base-300"
            >
              <Download size={12} />
            </button>
          </div>
        </div>
      );
    } else if (type === 'audio') {
      return (
        <div className="relative group">
          <audio src={url} controls className="mb-2" />
          <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => downloadFile(url, name || 'audio.mp3')}
              className="btn btn-circle btn-xs bg-base-200/80 hover:bg-base-300"
            >
              <Download size={12} />
            </button>
          </div>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-2 bg-base-200 p-2 rounded-lg mb-2 group relative">
          <File className="size-5" />
          <span className="text-sm truncate max-w-[150px]">{name || 'File'}</span>
          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => downloadFile(url, name || 'file')}
              className="btn btn-circle btn-xs bg-base-300/80 hover:bg-base-300"
            >
              <Download size={12} />
            </button>
          </div>
        </div>
      );
    }
  };
  
  return (
    <div className={`chat-bubble ${bubbleColor} whitespace-pre-wrap break-words max-w-xs sm:max-w-sm md:max-w-md`}>
      {message.file && renderFileContent()}
      {message.text}
    </div>
  );
};

export default ChatContainer;
