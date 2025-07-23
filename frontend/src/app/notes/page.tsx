"use client";

import React, { useState, useEffect } from 'react';
import { useCollapse } from 'react-collapsed';
import axios from 'axios';
import Navbar from '../components/navbar';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const socket = io(API_BASE_URL);

const NotesPage: React.FC = () => {
  const router = useRouter();
  
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
  const [loading, setLoading] = useState(true);
  const { getCollapseProps, getToggleProps, isExpanded } = useCollapse();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/user`, {
          credentials: "include",
        });
        const userData = await response.json();
        if (response.ok) setUser(userData);
        else router.push("/login");
      } catch (err) {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
    fetchNotes();
  }, [router]);

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
  };;

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
    socket.on("jobUpdated", () => {
      setNotes([]); 
      setNewNote('');
    });
    return () => {
      socket.off("jobUpdated");
    };
  }, []);

  useEffect(() => {
    if (isExpanded) {
      fetchNotes();
    }
  }, [isExpanded]);


  useEffect(() => {
    fetchNotes();
  }, [user?.email]);

  return (
    <div>
        <Navbar/>
      <h1>Notes</h1>
      <div {...getToggleProps()}>
        {isExpanded ? 'Collapse' : 'Expand'}
      </div>
      <div {...getCollapseProps()}>
        <div>
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Write your note here..."
          />
          <button onClick={handleAddNote}>Add Note</button>
        </div>
        <ul>
          {notes.map((note) => (
            <li key={note.id}>
              <p>{note.content}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default NotesPage;