import axios from "axios";

// Replace with your actual Render backend URL
const RENDER_BACKEND_URL = "https://mern-chat-app-new-backend.onrender.com";

const LOCALHOST_URL = "http://localhost:5000";

export const axiosInstance = axios.create({
  baseURL: `${RENDER_BACKEND_URL}/api`,
  withCredentials: true,
});
