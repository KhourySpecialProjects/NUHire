"use client"; // Declares that this page is a client component
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL; // API base URL from environment variables
import React, { useState, useEffect } from "react"; // Importing React and hooks for state and effect management

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
  
    useEffect(() => {
      const fetchUserEmail = async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/auth/user`, { credentials: "include" });
          const userData = await response.json();
          if (response.ok) {
            setUserEmail(userData.email);
          } else {
            console.error("Error fetching user");
          }
          console.log(userData.email);
        } catch (error) {
          console.error("Error fetching user:", error);
        }
      };
  
      fetchUserEmail();
    }, []);

  
  useEffect(() => {
    if (!userEmail) return;

    const fetchNotes = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/notes`, {
          credentials: "include",
        });

        if (!response.ok) throw new Error("Failed to fetch notes");

        const data = await response.json();
        setNotes(data);
      } catch (error) {
        console.error("Error fetching notes:", error);
      }
    };

    fetchNotes();
  }, [userEmail]);

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

      const newNote = await response.json();
      setNotes([...notes, newNote]);
      setNote(""); // Clear input
      window.location.reload();
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
          className="w-full p-2 border border-wood bg-northeasternWhite text-northeasternBlack rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button
          onClick={saveNote}
          className="mt-2 w-full bg-northeasternRed border-4 border-navy text-navy py-2 rounded-md hover:bg-sand transition"
        >
          Save Note
        </button>
      </div>

      {/* Display Saved Notes */}
      <div className="mt-4">
        <h2 className="font-bold text-navy">Saved Notes:</h2>
        <div className="max-h-[50vh] overflow-y-auto">
          {notes.length > 0 ? (
            notes.map((n) => (
              <p key={n.id} className="p-2 mt-2 border border-gray-200 rounded-md bg-springWater">
          {n.content}
              </p>
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
