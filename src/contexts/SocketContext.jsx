import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_BACKEND_URL;

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const listenersRef = useRef(new Map());

  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('connect_error', error => {
      console.error('🔌 Global socket connection error:', error);
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && socket) {
        if (!isConnected) {
          socket.connect();
        }
        socket.emit('requestGenerationSync', {
          storyId: window.currentStoryId,
        }); // Assume global storyId; adjust as needed
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [socket, isConnected]);

  const subscribe = (event, handler, key = null) => {
    if (!socket) return;

    const listenerKey = key || `${event}_${Date.now()}`;

    if (listenersRef.current.has(listenerKey)) {
      const oldHandler = listenersRef.current.get(listenerKey);
      socket.off(event, oldHandler);
    }

    const wrappedHandler = (...args) => {
      handler(...args);
    };

    socket.on(event, wrappedHandler);
    listenersRef.current.set(listenerKey, wrappedHandler);

    return () => {
      socket.off(event, wrappedHandler);
      listenersRef.current.delete(listenerKey);
    };
  };

  const unsubscribeAll = prefix => {
    if (!socket) return;

    for (const [key, handler] of listenersRef.current.entries()) {
      if (key.startsWith(prefix)) {
        const event = key.split('_')[0];
        socket.off(event, handler);
        listenersRef.current.delete(key);
      }
    }
  };

  const emit = (event, data) => {
    if (!socket || !isConnected) {
      return false;
    }

    socket.emit(event, data);
    return true;
  };

  const value = {
    socket,
    isConnected,
    subscribe,
    unsubscribeAll,
    emit,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};
