'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Slideshow from "../components/slideshow";
import Image from "next/image";
import { useProgressManager } from "../components/progress";

// Define API base URL with fallback
const API_BASE_URL = "https://nuhire-api-cz6c.onrender.com";

export default function SignupDetails() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [affiliation, setAffiliation] = useState('none');
  const [crn, setCrn] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const fetchUserDetails = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const userEmail = urlParams.get('email');
      const userFirstName = urlParams.get('firstName');
      const userLastName = urlParams.get('lastName');
      
      if (userEmail) {
        setEmail(userEmail);
        
        // Set first and last name from URL parameters if available
        if (userFirstName) {
          setFirstName(userFirstName);
        }
        
        if (userLastName) {
          setLastName(userLastName);
        }
      } else {
        setError('Authentication failed. Please try again.');
      }
    };

    fetchUserDetails();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // Basic validation
    if (!firstName || !lastName || !email || affiliation === 'none') {
      setError('Please fill in all required fields');
      return;
    }

    // Additional validation for students - require CRN
    if (affiliation === 'student' && !crn) {
      setError('Please enter your class CRN');
      return;
    }

    if (affiliation === 'student') {
      try {
        // Validate the CRN exists
        const res = await fetch(
          `${API_BASE_URL}/moderator-crns/${crn}`, // Use CRN instead of courseNumber
          { method: 'GET', credentials: 'include' }
        )
        const emailRes = await fetch(
          `${API_BASE_URL}/moderator-classes/${email}`,
          { method: 'GET', credentials: 'include' }
        )
        if (!res.ok || !emailRes.ok) {
          setError('Invalid CRN or cannot get backend data.');
          return;
        }
        const {id, admin_email, crn: validCrn, nom_groups} = await res.json();
        const emailData = await emailRes.json();
        console.log(emailData);
        if (emailData.length !== 0) {
          setError('This email is set as an instructor.');
          return;
        }
      } catch {
        setError('Failed to validate CRN. Please check the CRN and try again.');
        return;
      }
    }

    if (affiliation === 'admin') {
      try {
        const res = await fetch(
          `${API_BASE_URL}/moderator-classes/${email}`,
          { method: 'GET', credentials: 'include' }
        )
        if (!res.ok) {
          setError('Cannot get backend data.');
          return;
        }
        const crns = await res.json();
        if (crns.length === 0) {
          setError('This email is not set as a instructor.');
          return;
        }
      } catch {
        setError('Failed to validate Email. Please try again.');
        return;
      }
    }

    // Create user object
    const user = { 
      First_name: firstName, 
      Last_name: lastName, 
      Email: email, 
      Affiliation: affiliation,
      // Include class (CRN) for students
      ...(affiliation === 'student' && { Class: crn })
    };

    try {
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
        credentials: 'include'
      });

      if (response.ok) {
        setMessage('User added successfully!');
        setTimeout(() => {
          // Redirect to Keycloak login flow again to set session
          window.location.href = `${API_BASE_URL}/auth/keycloak`;
        }, 1500);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to add user');
      }
    } catch (error) {
      console.error('Error during signup:', error);
      setError('Failed to add user. Please check your connection or try again later.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-sand font-rubik">
      // Add this debug section right after your form
{/* DEBUG PANEL - Remove in production */}
<div className="mt-4 p-4 bg-yellow-100 border border-yellow-300 rounded-lg text-sm">
  <h4 className="font-semibold mb-2">🐛 Debug Info:</h4>
  <p><strong>Affiliation:</strong> {affiliation}</p>
  <p><strong>CRN:</strong> {crn}</p>
  <p><strong>Email:</strong> {email}</p>
  <button
    type="button"
    onClick={async () => {
      try {
        // Test CRN endpoint
        const crnRes = await fetch(`${API_BASE_URL}/moderator-crns`, { credentials: 'include' });
        const crnData = await crnRes.json();
        console.log('All CRNs in database:', crnData);
        
        // Test specific CRN
        if (crn) {
          const specificCrnRes = await fetch(`${API_BASE_URL}/moderator-crns/${crn}`, { credentials: 'include' });
          const specificCrnData = await specificCrnRes.json();
          console.log(`CRN ${crn} data:`, specificCrnData);
        }
        
        alert('Check console for database contents');
      } catch (error) {
        console.error('Debug fetch error:', error);
      }
    }}
    className="bg-blue-500 text-white px-3 py-1 rounded text-xs mt-2"
  >
    Debug: Check Database
  </button>
</div>
      <div className="fixed inset-0 z-0">
        <Slideshow />
      </div>
      <div className="fixed inset-0 bg-sand/80 z-5" />
      <div className="w-full flex justify-center p-4 bg-navy/90 backdrop-blur-sm shadow-md font-rubik text-lg fixed top-0 z-20">
        <h1 className="text-6xl font-extrabold mb-1 text-northeasternRed">NUHire</h1>
      </div>
      <div className="z-10" >
        <h1 className="text-3xl font-bold text-navy mb-6">Complete Your Signup</h1>

        <form onSubmit={handleSubmit} className="w-full max-w-md bg-navy shadow-lg rounded-lg p-6 flex flex-col gap-4">
          <input 
            type="text" 
            placeholder="First Name *" 
            className="w-full px-4 py-3 border border-wood bg-springWater rounded-md bg-gray-200 cursor-not-allowed"
            value={firstName} 
            disabled
          />

          <input 
            type="text" 
            placeholder="Last Name *" 
            className="w-full px-4 py-3 border border-wood bg-springWater rounded-md bg-gray-200 cursor-not-allowed"
            value={lastName} 
            disabled
          />

          <input 
            type="email" 
            className="w-full px-4 py-3 border border-wood bg-springWater rounded-md bg-gray-200 cursor-not-allowed"
            value={email} 
            disabled 
          />

          <select 
            value={affiliation} 
            className="w-full px-4 py-3 border border-wood bg-springWater rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
            onChange={(e) => setAffiliation(e.target.value)} 
            required
          >
            <option value="none">Select Affiliation *</option>
            <option value="student">Student</option>
            <option value="admin">Faculty</option>
          </select>

          {/* CRN Input - Only show for students */}
          {affiliation === 'student' && (
            <div className="w-full">
              <input 
                type="text" 
                placeholder="Enter your class CRN *" 
                className="w-full px-4 py-3 border border-wood bg-springWater rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={crn} 
                onChange={(e) => setCrn(e.target.value)}
                required
              />
              <p className="text-xs text-gray-300 mt-1">
                Enter the Course Reference Number (CRN) for your class
              </p>
            </div>
          )}

          <button 
            type="submit" 
            className="w-full bg-northeasternWhite text-northeasternRed font-semibold px-4 py-3 rounded-md hover:bg-northeasternRed hover:text-northeasternWhite transition"
          >
            Submit
          </button>
        </form>
        {message && (
          <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50">
            {message}
          </div>
        )}       
        {error && (
          <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50">
            {error}
          </div>
        )}     
      </div>
      <footer className="w-full flex justify-center p-2 bg-navy/90 backdrop-blur-sm shadow-md font-rubik text-2xl fixed bottom-0 z-20">
        <a
          className="flex items-center text-wood hover:text-blue-300 transition-colors duration-200"
          href="https://discord.gg/XNjg2VMR"
          target="_blank"
          rel="noopener noreferrer"
        >
        <Image src="/discord.svg" alt="Discord icon" width={25} height={25} />
        <span className="ml-2">Join our Discord</span>
        </a>
      </footer>
    </div>
  );
}