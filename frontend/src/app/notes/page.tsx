"use client";

import React, { useState, useEffect } from 'react';
import { useCollapse } from 'react-collapsed';
import axios from 'axios';
import Navbar from '../components/navbar';
import { useRouter } from 'next/navigation';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const NotesPage: React.FC = () => {
  const router = useRouter();
  
  const [notes, setNotes] = useState<string[]>([]);
  const [newNote, setNewNote] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const { getCollapseProps, getToggleProps, isExpanded } = useCollapse();

  interface User {
      id: string;
      group_id: string;
      email: string;
      class: number;
      affiliation: string;
  }


  const [user, setUser] = useState<User | null>(null);

  const handleAddNote = async () => {
    if (newNote.trim() && user && user.email) { 
      try {
        const response = await axios.post('/notes', { user_email: user.email, content: newNote });
        if (response.status === 201) {
          setNotes([...notes, newNote]);
          setNewNote('');
        }
      } catch (error) {
        console.error('Error adding note:', error);
      }
    }
  };

  // Load user
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
  }, [router]);

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
          {notes.map((note, index) => (
            <li key={index}>
              <p>{note}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default NotesPage;