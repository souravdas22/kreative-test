import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useDispatch, useSelector } from 'react-redux';
import { setSocketConnection, addMessage, updateMessagesSeen, fetchThreads } from '../features/chat/chatSlice';

const SOCKET_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:1947';

let globalSocket = null;

export const useSocket = () => {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (globalSocket) {
        globalSocket.disconnect();
        globalSocket = null;
      }
      return;
    }

    if (!globalSocket) {
      globalSocket = io(SOCKET_URL, {
        auth: { token: `Bearer ${token}` }
      });

      globalSocket.on('connect', () => {
        dispatch(setSocketConnection(true));
      });

      globalSocket.on('disconnect', () => {
        dispatch(setSocketConnection(false));
      });

      globalSocket.on('newMessage', (message) => {
        let parsedMessage = message;
        if (typeof message === 'string') {
          try { parsedMessage = JSON.parse(message); } catch (e) {}
        }
        dispatch(addMessage(parsedMessage));
      });

      globalSocket.on('updateThreads', () => {
        dispatch(fetchThreads({ page: 1, limit: 20 }));
      });

      globalSocket.on('messagesSeen', (data) => {
        let parsedData = data;
        if (typeof data === 'string') {
          try { parsedData = JSON.parse(data); } catch (e) {}
        }
        dispatch(updateMessagesSeen({ roomId: parsedData.roomId, userId: parsedData.userId }));
      });
    }

    return () => {
      // Socket is only disconnected when user logs out (!isAuthenticated).
    };
  }, [isAuthenticated, token, dispatch]);

  const joinRoom = (roomId) => {
    if (globalSocket) {
      globalSocket.emit('joinRoom', JSON.stringify({ roomId }));
    }
  };

  const sendMessage = (roomId, content, type = 'text') => {
    if (globalSocket) {
      globalSocket.emit('sendMessage', JSON.stringify({ roomId, content, type }));
    }
  };

  const markAsSeen = (roomId) => {
    if (globalSocket) {
      globalSocket.emit('markAsSeen', JSON.stringify({ roomId }));
    }
  };

  return { joinRoom, sendMessage, markAsSeen, socket: globalSocket };
};
