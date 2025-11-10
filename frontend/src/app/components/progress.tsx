'use client';

import { useSocket } from './socketContext';

const API_BASE_URL = "https://nuhire-api-cz6c.onrender.com";

interface User {
  email: string;
  class: number;
  group_id: number;
}

interface ProgressOperations {
  fetchProgress: (user: User) => Promise<string>;
  updateProgress: (user: User, step: string) => Promise<void>;
}

export const useProgressManager = (): ProgressOperations => {
  const socket = useSocket();

  const fetchProgress = async (user: User): Promise<string> => {
    if (!user?.email) {
      return 'none';
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/progress/user/${user.email}`,
        { credentials: 'include' }
      );
      
      if (response.ok) {
        const data = await response.json();
        return data?.step || 'none';
      }
      return 'none';
    } catch (error) {
      return 'none';
    }
  };

  const updateProgress = async (user: User, step: string): Promise<void> => {
    if (!user?.email || !socket) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          crn: user.class,
          group_id: user.group_id,
          step: step,
          email: user.email
        })
      });
      
      if (response.ok) {
        const responseData = await response.json();
        
        // Emit socket event to notify advisor dashboard to refresh
         socket.emit('progressUpdated', {
          crn: user.class,
          group_id: user.group_id,
          step: step,
          email: user.email
        });
        console.log('Progress update emitted to socket:', {
          crn: user.class,
          group_id: user.group_id,
          step: step,
          email: user.email
        });

      } else {
        const errorText = await response.text();
        throw new Error(`Failed to update progress: ${errorText}`);
      }
    } catch (error) {
      throw error;
    }
  };

  return { 
    fetchProgress, 
    updateProgress,
  };
};