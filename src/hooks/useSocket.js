import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useDispatch, useSelector } from 'react-redux';
import { setSocketConnection, addMessage, updateMessagesSeen, fetchThreads } from '../features/chat/chatSlice';

const SOCKET_URL = 'http://localhost:1947';

export const useSocket = () => {
  const dispatch = useDispatch();
  const socketRef = useRef(null);
  const token = useSelector((state) => state.auth.token);
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const activeRoomId = useSelector((state) => state.chat.activeRoomId);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      
      return;
    }

    if (!socketRef.current) {
      socketRef.current = io(SOCKET_URL, {
        auth: { token: `Bearer ${token}` }
      });

      socketRef.current.on('connect', () => {
        dispatch(setSocketConnection(true));
      });

      socketRef.current.on('disconnect', () => {
        dispatch(setSocketConnection(false));
      });

      socketRef.current.on('newMessage', (message) => {
        // message should be parsed if it's sent as string, but socket.io usually handles JSON objects.
        // The prompt says "Make sure you stringify the payload before emitting, as the backend strictly parses strings!"
        // Assuming backend sends JSON object for newMessage
        let parsedMessage = message;
        if (typeof message === 'string') {
          try { parsedMessage = JSON.parse(message); } catch (e) {}
        }
        dispatch(addMessage(parsedMessage));
      });

      socketRef.current.on('updateThreads', () => {
        dispatch(fetchThreads({ page: 1, limit: 20 }));
      });

      socketRef.current.on('messagesSeen', (data) => {
        let parsedData = data;
        if (typeof data === 'string') {
          try { parsedData = JSON.parse(data); } catch (e) {}
        }
        dispatch(updateMessagesSeen({ roomId: parsedData.roomId, userId: parsedData.userId }));
      });
    }

    return () => {
      // Don't disconnect on every re-render, only when unmounting the whole hook context (handled by auth check above usually, or app unmount)
    };
  }, [isAuthenticated, token, dispatch]);

  const joinRoom = (roomId) => {
    if (socketRef.current) {
      socketRef.current.emit('joinRoom', JSON.stringify({ roomId }));
    }
  };

  const sendMessage = (roomId, content, type = 'text') => {
    if (socketRef.current) {
      socketRef.current.emit('sendMessage', JSON.stringify({ roomId, content, type }));
    }
  };

  const markAsSeen = (roomId) => {
    if (socketRef.current) {
      socketRef.current.emit('markAsSeen', JSON.stringify({ roomId }));
    }
  };

  return { joinRoom, sendMessage, markAsSeen, socket: socketRef.current };
};
