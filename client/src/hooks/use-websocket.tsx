import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';
import { queryClient } from '@/lib/queryClient';

type WebSocketStatus = 'connecting' | 'open' | 'closed' | 'error';

export function useWebSocket() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<WebSocketStatus>('closed');
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Function to establish websocket connection
  const connect = useCallback(() => {
    // Only connect if user is authenticated
    if (!user) {
      setStatus('closed');
      return;
    }

    // Close existing connection if any
    if (socketRef.current) {
      socketRef.current.close();
    }

    // Clear any pending reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    try {
      // Determine WebSocket protocol and URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      // Create new WebSocket connection
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;
      setStatus('connecting');

      socket.onopen = () => {
        setStatus('open');
        console.log('WebSocket connection established');
        
        // Authenticate the connection with user ID
        if (user) {
          socket.send(JSON.stringify({
            type: 'auth',
            userId: user.id,
            token: localStorage.getItem('authToken'), // Send stored token for authentication
          }));
        }
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data);
          
          // Handle different message types
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      socket.onclose = () => {
        setStatus('closed');
        console.log('WebSocket connection closed');
        
        // Attempt to reconnect after a delay
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect WebSocket...');
          connect();
        }, 3000);
      };

      socket.onerror = (error) => {
        setStatus('error');
        console.error('WebSocket error:', error);
        
        // Close the socket on error
        socket.close();
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setStatus('error');
      
      // Attempt to reconnect after a delay
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('Attempting to reconnect WebSocket...');
        connect();
      }, 5000);
    }
  }, [user]);

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = useCallback((data: any) => {
    switch (data.type) {
      case 'auth_success':
        console.log('WebSocket authentication successful');
        break;
        
      case 'friendship_request':
        // Invalidate friends cache to refresh the list
        queryClient.invalidateQueries({ queryKey: ['/api/friends'] });
        
        // Show notification toast
        toast({
          title: 'New Friend Request',
          description: `${data.from.name} (@${data.from.username}) sent you a friend request`,
          variant: 'default',
        });
        break;
        
      case 'friendship_updated':
        // Invalidate friends cache
        queryClient.invalidateQueries({ queryKey: ['/api/friends'] });
        
        // Show appropriate notification based on status
        if (data.status === 'accepted') {
          toast({
            title: 'Friend Request Accepted',
            description: `${data.from.name} accepted your friend request`,
            variant: 'default',
          });
        } else if (data.status === 'rejected') {
          toast({
            title: 'Friend Request Declined',
            description: `${data.from.name} declined your friend request`,
            variant: 'destructive',
          });
        }
        break;
        
      case 'toast_shared':
        toast({
          title: 'Toast Shared With You',
          description: `${data.from.name} shared a weekly toast with you`,
          variant: 'default',
          action: (
            <a 
              href={`/shared/${data.shareCode}`} 
              className="underline text-primary hover:text-primary/90"
            >
              View Toast
            </a>
          ),
        });
        break;
        
      case 'toast_comment':
        // Invalidate comments cache for this toast
        queryClient.invalidateQueries({ 
          queryKey: [`/api/toasts/${data.toastId}/comments`] 
        });
        
        toast({
          title: 'New Comment on Your Toast',
          description: `${data.from.name} commented: "${data.comment.comment.substring(0, 30)}${data.comment.comment.length > 30 ? '...' : ''}"`,
          variant: 'default',
        });
        break;
        
      case 'toast_reaction':
        // Invalidate reactions cache for this toast
        queryClient.invalidateQueries({ 
          queryKey: [`/api/toasts/${data.toastId}/reactions`] 
        });
        
        toast({
          title: 'New Reaction on Your Toast',
          description: `${data.from.name} reacted with ${data.reaction}`,
          variant: 'default',
        });
        break;
        
      default:
        console.log('Unknown WebSocket message type:', data.type);
    }
  }, [toast]);

  // Connect/disconnect based on authentication status
  useEffect(() => {
    if (user) {
      connect();
    } else {
      // Close any existing connection when user logs out
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      
      // Clear any reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      setStatus('closed');
    }
    
    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [user, connect]);

  // Public method to send messages through the WebSocket
  const sendMessage = useCallback((message: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  return {
    status,
    sendMessage,
    connect,
  };
}