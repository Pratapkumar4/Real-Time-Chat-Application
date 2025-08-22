import mongoose from "mongoose";

// Validator function to limit array length to 2
function arrayLimit(val) {
  return val.length <= 2;
}

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    profilePic: {
      type: String,
      default: "",
    },
    friends: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    pinnedChats: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
      validate: [arrayLimit, '{PATH} exceeds the limit of 2']
    },
    lastInteractions: {
      type: Map,
      of: Date,
      default: new Map()
    },
    friendRequests: {
      type: [{
        from: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }],
      default: [],
    },
    notifications: {
      type: [{
        type: {
          type: String,
          enum: ["friend_request", "friend_accepted"],
          required: true
        },
        from: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true
        },
        read: {
          type: Boolean,
          default: false
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }],
      default: [],
    }
  },
  { timestamps: true }
);


const User = mongoose.model("User", userSchema);

export default User;
