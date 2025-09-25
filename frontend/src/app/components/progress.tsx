'use client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
  console.log("API_BASE_URL:", API_BASE_URL); // Add this line to debug

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

  const fetchProgress = async (user:User): Promise<string> => {
    console.log("fetchProgress called with user:", user);
    console.log("Full URL being called:", `${API_BASE_URL}/progress/user/${user.email}`); // Add this


    if (!user?.email) {
      console.log('fetchProgress: No user email found after loading');
      return 'none';
    }

    try {
      console.log(`fetchProgress: Fetching progress for email ${user.email}`);
      const response = await fetch(
        `${API_BASE_URL}/progress/user/${user.email}`,
        { credentials: 'include' }
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log('fetchProgress: Received data:', data);
        return data?.step || 'none';
      }
      console.log('fetchProgress: Response not OK, returning default none');
      return 'none';
    } catch (error) {
      console.error('fetchProgress Error:', error);
      return 'none';
    }
  };

  const updateProgress = async (user: User, step: string): Promise<void> => {
    console.log("updateProgress called with user:", user, "and step:", step);
    console.log("Full URL being called:", `${API_BASE_URL}/progress`); // Add this

    if (!user?.email) {
        console.log('updateProgress: No user email found, cannot update progress');
        return;
    }

    try {
      console.log('updateProgress: Sending request with data:', {
        crn: user.class,
        group_id: user.group_id,
        step: step,
        email: user.email
      });

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
        console.log('updateProgress: Success response:', responseData);
      } else {
        const errorText = await response.text();
        console.error('updateProgress: Failed response:', errorText);
        throw new Error(`Failed to update progress: ${errorText}`);
      }
    } catch (error) {
      console.error('updateProgress Error:', error);
      throw error;
    }
  };

  return { 
    fetchProgress, 
    updateProgress,
  };
};