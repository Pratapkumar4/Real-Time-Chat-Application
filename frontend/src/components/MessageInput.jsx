import { useEffect, useRef, useState, memo, lazy, Suspense } from "react";
import { useChatStore } from "../store/useChatStore";
import { File, Image, Send, Smile, X } from "lucide-react";
import toast from "react-hot-toast";

// Lazy load the emoji picker for better performance
const EmojiPicker = lazy(() => import("emoji-picker-react"));

// Memoize the emoji picker component to prevent unnecessary re-renders
const MemoizedEmojiPicker = memo(EmojiPicker);

const MessageInput = () => {
  const [text, setText] = useState("");
  const [filePreview, setFilePreview] = useState(null);
  const [fileData, setFileData] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const textareaRef = useRef(null);
  const { sendMessage } = useChatStore();
  
  // Close emoji picker when clicking outside
  const handleClickOutside = (e) => {
    if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
      setShowEmojiPicker(false);
    }
  };
  
  // Add event listener for clicks outside emoji picker
  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      // Reset height to auto to get the correct scrollHeight
      textareaRef.current.style.height = "auto";
      // Set the height based on scrollHeight (with max height of 4 lines)
      const newHeight = Math.min(textareaRef.current.scrollHeight, 100);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [text]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size should be less than 10MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      // Store file metadata and data
      setFileData({
        data: reader.result,
        type: file.type.split('/')[0], // image, video, audio, etc.
        name: file.name,
        size: file.size,
      });
      
      // Set preview based on file type
      setFilePreview({
        url: reader.result,
        type: file.type,
        name: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  const removeFile = () => {
    setFilePreview(null);
    setFileData(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleKeyDown = (e) => {
    // Allow Shift+Enter for new line
    if (e.key === "Enter" && e.shiftKey) {
      return; // Let the default behavior happen (new line)
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !fileData) return;

    try {
      await sendMessage({
        text: text, // Keep the text as is to preserve formatting
        file: fileData,
      });

      // Clear form
      setText("");
      setFilePreview(null);
      setFileData(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const getFilePreviewContent = () => {
    if (!filePreview) return null;
    
    const { url, type, name } = filePreview;
    
    if (type.startsWith('image/')) {
      return <img src={url} alt="Preview" className="w-20 h-20 object-cover rounded-lg" />;
    } else if (type.startsWith('video/')) {
      return <video src={url} className="w-20 h-20 object-cover rounded-lg" />;
    } else if (type.startsWith('audio/')) {
      return <audio src={url} controls className="w-20 h-10" />;
    } else {
      return (
        <div className="flex items-center gap-2 bg-base-200 p-2 rounded-lg">
          <File className="size-5" />
          <span className="text-xs truncate max-w-[120px]">{name}</span>
        </div>
      );
    }
  };

  // Handle emoji selection
  const onEmojiClick = (emojiObject) => {
    setText(prevText => prevText + emojiObject.emoji);
  };
  
  return (
    <div className="p-4 w-full">
      {filePreview && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            {getFilePreviewContent()}
            <button
              onClick={removeFile}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300
              flex items-center justify-center"
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        {/* Emoji picker button - moved to left */}
        <button
          type="button"
          className="hidden sm:flex btn btn-circle text-zinc-400"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
        >
          <Smile size={20} />
        </button>
        
        {/* File upload button - moved to left */}
        <button
          type="button"
          className={`hidden sm:flex btn btn-circle
                   ${filePreview ? "text-emerald-500" : "text-zinc-400"}`}
          onClick={() => fileInputRef.current?.click()}
        >
          <Image size={20} />
        </button>
        
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            className="w-full input input-bordered rounded-lg input-sm sm:input-md resize-none min-h-[40px] py-2 px-3 overflow-y-auto scrollbar-hide"
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows="1"
            style={{ maxHeight: '100px' }}
          />
          
          <input
            type="file"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,video/*,audio/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          />
          
          {/* Emoji picker dropdown */}
          {showEmojiPicker && (
            <div 
              className="absolute bottom-14 left-0 z-10"
              ref={emojiPickerRef}
            >
              <Suspense fallback={<div className="bg-base-200 rounded-lg p-4 w-[300px] h-[400px] flex items-center justify-center">Loading...</div>}>
                <MemoizedEmojiPicker 
                  onEmojiClick={onEmojiClick} 
                  width={300} 
                  height={400}
                  previewConfig={{ showPreview: false }}
                  lazyLoadEmojis={true}
                  skinTonesDisabled={true}
                  searchDisabled={false}
                  autoFocusSearch={false}
                />
              </Suspense>
            </div>
          )}
        </div>
        
        <button
          type="submit"
          className="btn btn-sm btn-circle"
          disabled={!text.trim() && !filePreview}
        >
          <Send size={22} />
        </button>
      </form>
    </div>
  );
};
export default MessageInput;
