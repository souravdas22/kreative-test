import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const BASE_URL = 'http://localhost:1947/api/v1/chat';
const IMAGE_BASE_URL = 'https://kreativ-vault.dedicateddevelopers.us/uploads/users/';
const MESSAGE_FILE_BASE_URL = 'http://127.0.0.1:1947/uploads/chat/';

const getFullImageUrl = (imageName) => {
  if (!imageName) return null;
  if (imageName.startsWith('http')) return imageName;
  return `${IMAGE_BASE_URL}${imageName}`;
};

const getMessageFileUrl = (fileName) => {
  if (!fileName) return null;
  if (fileName.startsWith('http')) return fileName;
  return `${MESSAGE_FILE_BASE_URL}${fileName}`;
};

const getHeaders = (getState) => {
  const token = getState().auth.token;
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export const fetchThreads = createAsyncThunk(
  'chat/fetchThreads',
  async ({ page = 1, limit = 20 }, { getState, rejectWithValue }) => {
    try {
      const response = await fetch(`${BASE_URL}/threads`, {
        method: 'POST',
        headers: getHeaders(getState),
        body: JSON.stringify({ page, limit })
      });
      if (!response.ok) throw new Error('Failed to fetch threads');
      return await response.json();
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchMessages = createAsyncThunk(
  'chat/fetchMessages',
  async ({ roomId, page = 1, limit = 50 }, { getState, rejectWithValue }) => {
    try {
      const response = await fetch(`${BASE_URL}/messages/${roomId}`, {
        method: 'POST',
        headers: getHeaders(getState),
        body: JSON.stringify({ page, limit })
      });
      if (!response.ok) throw new Error('Failed to fetch messages');
      return await response.json();
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchUserProfile = createAsyncThunk(
  'chat/fetchUserProfile',
  async (roomId, { getState, rejectWithValue }) => {
    try {
      const response = await fetch(`${BASE_URL}/user-profile/${roomId}`, {
        headers: getHeaders(getState)
      });
      if (!response.ok) throw new Error('Failed to fetch profile');
      return await response.json();
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const initialState = {
  threads: [],
  activeRoomId: null,
  activeUserProfile: null,
  messages: [],
  socketConnected: false,
  status: 'idle',
  error: null,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setActiveRoom: (state, action) => {
      state.activeRoomId = action.payload;
      state.messages = []; // Clear previous messages
      state.activeUserProfile = null; // Clear previous profile
    },
    setSocketConnection: (state, action) => {
      state.socketConnected = action.payload;
    },
    addMessage: (state, action) => {
      const msg = action.payload;
      // Determine the room ID from the incoming message, checking common keys
      const incomingRoomId = msg.roomId || msg.chatId || msg.conversationId || msg.threadId;

      // Append if it explicitly belongs to the active room, 
      // OR if the message doesn't have a room identifier (assuming it's scoped to the current joined room).
      if (!incomingRoomId || incomingRoomId === state.activeRoomId) {
        state.messages.push({
          ...msg,
          content: msg.type !== 'text' && msg.fileUrl ? getMessageFileUrl(msg.fileUrl) : msg.content
        });
      }
    },
    updateMessagesSeen: (state, action) => {
      const { roomId, userId } = action.payload;
      if (state.activeRoomId === roomId) {
        state.messages.forEach(msg => {
          // If the person who read the messages (userId) is NOT the sender of the message,
          // then the message has been seen by the recipient.
          if (msg.senderId !== userId) {
            msg.isSeen = true;
          }
        });
      }
    },
    resetChatState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchThreads.fulfilled, (state, action) => {
        const payload = action.payload || {};
        const docs = payload.data?.docs || [];
        
        state.threads = docs.map(thread => ({
          roomId: thread._id,
          participantName: thread.otherParticipant?.fullName || 'Unknown User',
          profileImage: getFullImageUrl(thread.otherParticipant?.profileImage),
          isOnline: thread.otherParticipant?.isOnline || false,
          lastMessage: thread.lastMessage,
          lastMessageTime: thread.lastMessageTime,
          unseenCount: thread.unseenCount || 0,
        }));
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        const payload = action.payload || {};
        let docs = payload.data?.docs || [];
        
        // Reverse if backend sends newest first, else keep as is.
        // Also map fileUrl to content for media types
        state.messages = docs.map(msg => ({
          ...msg,
          content: msg.type !== 'text' && msg.fileUrl ? getMessageFileUrl(msg.fileUrl) : msg.content
        })).reverse(); // Reversing assumes oldest should be at top but API returns newest first (common for pagination)
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        const profile = action.payload?.data || action.payload || {};
        state.activeUserProfile = {
          ...profile,
          profileImage: getFullImageUrl(profile.profileImage)
        };
      });
  },
});

export const { setActiveRoom, setSocketConnection, addMessage, updateMessagesSeen, resetChatState } = chatSlice.actions;
export default chatSlice.reducer;
