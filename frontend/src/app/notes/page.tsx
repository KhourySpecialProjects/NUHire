"use client";
export const dynamic = "force-dynamic";
import React, { useState, useEffect } from 'react';
import Navbar from '../components/navbar';
import { useRouter } from 'next/navigation';
import { useSocket } from '../components/socketContext';
import { useAuth } from '../components/AuthContext';

const API_BASE_URL = "https://nuhire-api-cz6c.onrender.com";
const NotesPage: React.FC = () => {
  const router = useRouter();
  const socket = useSocket();

  
  interface Note {
    id: number;
    content: string;
  }

  interface User {
    id: string;
    group_id: string;
    email: string;
    class: number;
    affiliation: string;
  }
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  
  const { user, loading: userloading } = useAuth();

  

  useEffect(() => {
    fetchNotes();
  }, [user?.email]);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    try {
      const response = await fetch(`${API_BASE_URL}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({user_email: user?.email, content: newNote }),
      });

      if (!response.ok) throw new Error(`Failed to save note: ${user?.email}`);
      console.log("Note saved successfully");
      const newN = await response.json();
      setNotes([...notes, newN]);
      fetchNotes();
      setNewNote("");
    } catch (error) {
      console.error("Error saving note:", error);
    }
  };

  const fetchNotes = async () => {
    if (!user?.email) return;
    try {
      const response = await fetch(`${API_BASE_URL}/notes?user_email=${encodeURIComponent(user!.email)}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch notes");
      const data = await response.json();
      setNotes(data);
    } catch (error) {
      console.error("Error fetching notes:", error);
    }
  };

  useEffect(() => {
    if (!socket) return;

    const handleJobUpdated = () => {
      setNotes([]); 
      setNewNote('');
    };

    socket.on("jobUpdated", handleJobUpdated);
    
    return () => {
      socket.off("jobUpdated", handleJobUpdated);
    };
  }, [socket]);

  useEffect(() => {
    fetchNotes();
  }, [user?.email]);

  if (userloading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-sand">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Loading...</h2>
          <div className="w-16 h-16 border-t-4 border-northeasternBlack border-solid rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }  
  

  return (
    <div className="min-h-screen bg-sand">
      <Navbar/>
      <div className="container mx-auto py-8 px-4">
        <div className="bg-springWater rounded-lg shadow-lg p-6 border-2 border-northeasternRed">
          <h1 className="text-3xl font-bold text-northeasternRed mb-6 text-center">My Notes</h1>
          
          <div className="mb-6 bg-sand p-4 rounded-md border border-navy">
            <h2 className="text-xl font-semibold text-northeasternRed mb-3">Add a New Note</h2>
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Write your note here..."
              className="w-full p-3 border-2 border-navy rounded-md focus:outline-none focus:ring-2 focus:ring-northeasternRed min-h-[120px] mb-3 bg-springWater text-navy"
            />
            <button 
              onClick={handleAddNote}
              className="w-full bg-northeasternRed text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors font-bold border-2 border-navy"
            >
              Add Note
            </button>
          </div>
          
          <div className="bg-sand p-4 rounded-md border border-navy">
            <h2 className="text-xl font-semibold text-northeasternRed mb-4">My Saved Notes</h2>
            
            {notes.length > 0 ? (
              <ul className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {notes.map((note) => (
                  <li key={note.id} className="bg-springWater p-4 rounded-md shadow border border-navy">
                    <p className="text-navy whitespace-pre-wrap break-words text-center">{note.content}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-navy text-center py-4">No notes yet. Add your first note above!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotesPage;