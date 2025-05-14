import { createContext, ReactNode, useContext } from 'react';
import { useWebSocket } from './use-websocket';

type WebSocketStatus = 'connecting' | 'open' | 'closed' | 'error';

type WebSocketContextType = {
  status: WebSocketStatus;
  sendMessage: (message: any) => boolean;
  connect: () => void;
};

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const websocket = useWebSocket();
  
  return (
    <WebSocketContext.Provider value={websocket}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
}