# Chat Application - Frontend Knowledge Transfer

This document provides a comprehensive overview of the real-time chat application's architecture, including Socket.IO events, REST APIs, and connection workflows for the frontend team.

## 1. Authentication & Socket Connection

The chat system uses Socket.IO for real-time bidirectional communication.

**Connection URL:** `wss://<your-backend-url>`
*(Note: Ensure your Socket.IO client version matches the server's NestJS/Socket.IO version, typically v4.x).*

### Connection Workflow
1. **Connect:** Pass the JWT access token during the connection handshake. The backend accepts it via `auth.token` or `headers.authorization`.
   ```javascript
   const socket = io('wss://<your-backend-url>', {
     auth: {
       token: `Bearer ${your_jwt_token}`
     }
   });
   ```
2. **Presence Management:** Upon a successful connection, the backend automatically updates the user's status to `isOnline: true` and joins them into a personal socket room (using their `userId`).
3. **Disconnection:** When the user disconnects, the backend sets their status to `isOnline: false` and updates their `lastSeen` timestamp.

---

## 2. Socket Events (Real-time Flow)

### 📤 Events to Emit (Client -> Server)

> [!NOTE]
> All payloads sent to the server can be either parsed JSON objects or stringified JSON.

| Event Name | Payload Format | Description |
| :--- | :--- | :--- |
| `joinRoom` | `{ roomId: string }` | Call this when the user opens a specific chat thread. It subscribes the user to the `roomId` to receive messages. |
| `sendMessage` | `{ roomId: string, content?: string, fileUrl?: string, type?: string }` | Sends a new message. `type` defaults to `'text'` but can be `'photo'`, `'video'`, `'audio'`, or `'file'`. If sending a text, pass `content`. |
| `markAsSeen` | `{ roomId: string }` | Call this when the user opens a chat thread or scrolls to the bottom. It resets the `unseenCount` to 0 and adds the user to the `seenBy` array of the messages. |

### 📥 Events to Listen for (Server -> Client)

| Event Name | Payload Format | Description |
| :--- | :--- | :--- |
| `newMessage` | `ChatMessage` object | Triggered when a new message is received in the actively joined room. Append this message to your local messages state. |
| `updateThreads` | `ChatMessage` object \| `undefined` | Triggered when a new message is sent globally to the user, OR when the user marks messages as seen. Use this to re-fetch or re-order your sidebar threads and update unread badges. |
| `messagesSeen` | `{ roomId: string, userId: string }` | Triggered to notify that the other participant (`userId`) has seen the messages in `roomId`. Use this to display "Read" receipts (e.g., double blue ticks). |

---

## 3. REST APIs

All APIs are prefixed with `/api/v1/chat` (assuming standard global prefix `/api` and version `v1` from the controller definition). They require a valid Bearer token.

### Get Chat Threads (Sidebar)
- **Endpoint:** `POST /chat/threads`
- **Purpose:** Fetches the paginated list of chat conversations.
- **Body:**
  ```json
  {
    "page": 1,
    "limit": 10
  }
  ```

### Get Messages (Chat History)
- **Endpoint:** `POST /chat/messages/:roomId`
- **Purpose:** Fetches the paginated message history for a specific chat room.
- **URL Parameter:** `roomId` (MongoDB ObjectId)
- **Body:**
  ```json
  {
    "page": 1,
    "limit": 10
  }
  ```

### Get User Profile (Chat Header)
- **Endpoint:** `GET /chat/user-profile/:roomId`
- **Purpose:** Fetches the profile details (name, avatar, online status, last seen) of the *other* participant in the current chat room.

### Upload Chat Media/Files
- **Endpoint:** `POST /chat/upload/:roomId`
- **Purpose:** Uploads files (images, videos, documents, audio) directly into the chat room. The backend handles saving the message and broadcasting the socket events automatically.
- **Headers:** `Content-Type: multipart/form-data`
- **Form Data payload:**
  - `files`: The actual file attachments (array of files).
  - `type`: String indicating the file type. Must be one of `['photo', 'video', 'audio', 'file']`.

> [!TIP]
> **File Upload Workflow:** You do not need to manually emit a `sendMessage` socket event after successfully uploading a file via this API. The backend automatically broadcasts the `newMessage` and `updateThreads` socket events to all participants.

---

## 4. Typical Frontend Flow Summary

1. **Initialization:** Connect to Socket.IO using the JWT token. Listen for `updateThreads`. Fetch the initial sidebar threads using `POST /chat/threads`.
2. **Selecting a Thread:**
   - Fetch the other participant's profile via `GET /chat/user-profile/:roomId`.
   - Fetch chat history via `POST /chat/messages/:roomId`.
   - Emit `joinRoom` with the `roomId`.
   - Emit `markAsSeen` with the `roomId`.
3. **Chatting:**
   - Listen for `newMessage`.
   - On submit, emit `sendMessage` (for text) or call `POST /chat/upload/:roomId` (for files).
4. **Read Receipts:**
   - Listen for `messagesSeen` to update UI checkmarks.
5. **Leaving a Thread:**
   - (Optional, but good practice) You can emit a `leaveRoom` if implemented, or simply rely on `joinRoom` when switching threads. Disconnecting the socket on logout handles full cleanup.
