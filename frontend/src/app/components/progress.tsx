'use client';

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
    if (!user?.email) {
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
        console.log("Progress updated successfully to, ", step);
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