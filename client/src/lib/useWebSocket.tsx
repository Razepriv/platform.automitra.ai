import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQuery } from '@tanstack/react-query';

interface WebSocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
}

type AuthUser = {
  id: string;
  organizationId?: string | null;
};

const WebSocketContext = createContext<WebSocketContextValue>({
  socket: null,
  isConnected: false,
});

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const { data: user } = useQuery<AuthUser | null>({
    queryKey: ['/api/auth/user'],
  });

  useEffect(() => {
    // Wait for user data to be available
    if (!user?.organizationId) {
      // Disconnect if user logs out
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    // Only create one socket connection
    if (socketRef.current) {
      // If socket exists but org changed, disconnect and reconnect
      if (socketRef.current.connected) {
        return;
      }
    }

    // Connect to WebSocket server
    const socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      
      // Join organization-specific room for multi-tenant isolation
      if (user.organizationId) {
        socket.emit('join:organization', user.organizationId);
      }
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setIsConnected(false);
    });

    return () => {
      if (socket && user.organizationId) {
        socket.emit('leave:organization', user.organizationId);
        socket.disconnect();
        socketRef.current = null;
      }
    };
  }, [user]);

  return (
    <WebSocketContext.Provider value={{ socket: socketRef.current, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
}

// Hook to access the shared WebSocket connection
export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}

// Hook for listening to specific events
export function useWebSocketEvent<T = any>(
  eventName: string,
  handler: (data: T) => void
) {
  const { socket, isConnected } = useWebSocket();

  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.on(eventName, handler);

    return () => {
      socket.off(eventName, handler);
    };
  }, [socket, isConnected, eventName, handler]);

  return { isConnected };
}
