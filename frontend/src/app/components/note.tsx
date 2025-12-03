"use client"; // Declares that this page is a client component
const API_BASE_URL = "https://nuhire-api-cz6c.onrender.com"; // API base URL from environment variables
import React, { useState, useCallback, useEffect } from "react"; // Importing React and hooks for state and effect management
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const socket = io(API_BASE_URL);
const NotesPage = () => {
  // State variables to manage notes and their visibility
  const [isOpen, setIsOpen] = useState(false);
  const [note, setNote] = useState("");
  
  interface Note {
    id: string;
    content: string;
  }

  const [notes, setNotes] = useState<Note[]>([]);
  const [userEmail, setUserEmail] = useState("");
  const { user, loading: userloading } = useAuth();

  useEffect(() => {
    if (user && user.email) {
      setUserEmail(user.email);
    }
  }, [user]);

  const fetchNotes = useCallback(async () => {
    if (!userEmail) return;
    try {
      const response = await fetch(`${API_BASE_URL}/notes?user_email=${encodeURIComponent(userEmail)}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch notes");
      const data = await response.json();
      setNotes(data);
    } catch (error) {
      console.error("Error fetching notes:", error);
    }
  }, [userEmail]); // ✅ Make fetchNotes stable with useCallback

// Then the useEffect becomes:
useEffect(() => {
  fetchNotes();
}, [fetchNotes]); // ✅ Now depends on the stable callback

  useEffect(() => {
    socket.on("jobUpdated", () => {
      setNotes([]); 
      setNote('');
    });
    return () => {
      socket.off("jobUpdated");
    };
  }, []);
  

  const saveNote = async () => {
    if (!note.trim()) return;

    try {
      const response = await fetch(`${API_BASE_URL}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({user_email: userEmail, content: note }),
      });

      if (!response.ok) throw new Error(`Failed to save note: ${userEmail}`);
      console.log("Note saved successfully");
      const newNote = await response.json();
      setNotes([...notes, newNote]);
      fetchNotes();
      setNote("");
    } catch (error) {
      console.error("Error saving note:", error);
    }
  };

  return (
    <div className="relative p-4">
      {/* Toggle Notes Button */}
      <button
        className="bg-northeasternRed text-northeasterWhite px-4 py-2 rounded-md hover:bg-sand border-4 border-navy transition"
        onClick={() => setIsOpen(!isOpen)}
      >
        ☰ Notes
      </button>

      {isOpen && (
        <div className="absolute top-14 right-4 w-80 bg-northeasternWhite opacity-100 shadow-lg rounded-lg p-4 border border-gray-300 z-50">
          {/* Note Input Section */}
          <div className="mb-4">
            <textarea
              placeholder="Enter your notes..."
              className="w-full p-2 border border-gray-300 bg-northeasternWhite text-northeasternBlack rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />t
            <button
              onClick={saveNote}
              className="mt-2 w-full bg-northeasternWhite border border-gray-300 text-northeasternBlack py-2 rounded-md hover:bg-sand transition"
            >
              Save Note
            </button>
          </div>

          {/* Display Saved Notes */}
          <div className="mt-4">
            <h2 className="font-bold text-navy">Saved Notes:</h2>
            <div className="max-h-60 overflow-y-auto pr-1">
              {notes.length > 0 ? (
                notes.map((n) => (
                  <div key={n.id} className="mt-2 border border-gray-200 rounded-md bg-springWater">
                    <p className="text-northeasternBlack p-2 max-h-24 overflow-y-auto break-words">
                      {n.content}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-navy mt-2">No notes found.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotesPage;