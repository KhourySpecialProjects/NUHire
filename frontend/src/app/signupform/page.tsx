'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Slideshow from "../components/slideshow";
import Image from "next/image";

// Define API base URL with fallback
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function SignupDetails() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [affiliation, setAffiliation] = useState('none');
  const [groupNumber, setGroupNumber] = useState('');
  const [courseNumber, setCourseNumber] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const [modPass, setModPass] = useState('');

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

    if (affiliation === 'student' && !groupNumber && !courseNumber) {
      setError('Please enter your group number and course number'); 
      return;
    }

    if (affiliation === 'student') {
      try {
        console.log("Group", groupNumber);
        console.log("Course", courseNumber);
        const res = await fetch(
          `${API_BASE_URL}/moderator-crns/${courseNumber}`,
          { method: 'GET', credentials: 'include' }
        )
        const emailRes = await fetch(
          `${API_BASE_URL}/moderator-classes/${email}`,
          { method: 'GET', credentials: 'include' }
        )
        if (!res.ok || !emailRes.ok) {
          setError('Cannot get backend data.');
          return;
        }
        const {id, admin_email, crn, nom_groups} = await res.json();
        const emailData = await emailRes.json();
        console.log(emailData);
        if (emailData.length !== 0) {
          setError('This email is set as an instructor.');
          return;
        }
        if (Number(crn) !== Number(courseNumber)) {
          setError('This CRN does not exist. Please check with your instructor.');
          return;
        }
        if (nom_groups < 1 || nom_groups < groupNumber) {
          setError(
            `Group number must be between 1 and ${nom_groups} for this CRN.`
          );
          return;
        }
      } catch {
        setError('Failed to validate CRN/group number. Please try again.');
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
      // Include group_id only for students
      ...(affiliation === 'student' && { group_id: groupNumber, course_id: courseNumber })
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
        // Show success message briefly before redirecting
        setTimeout(() => {
          if (affiliation === 'student') {
            localStorage.setItem("progress", "");
            console.log("going to dashboard");
            router.push('/dashboard'); 
          } else if (affiliation === 'admin') {
            console.log("going to dashboard");
            router.push('/advisor-dashboard');
          }
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

          {/* Group number input - only shown for students */}
          {affiliation === 'student' && (
            <div  className="w-full rounded-lg flex flex-col gap-4">
              <input 
              type="number" 
              placeholder="CRN *" 
              className="w-full px-4 py-3 border border-wood bg-springWater rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={courseNumber} 
              onChange={(e) => setCourseNumber(e.target.value)} 
              required 
              min="1"
            />
            <input 
              type="number" 
              placeholder="Group Number *" 
              className="w-full px-4 py-3 border border-wood bg-springWater rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={groupNumber} 
              onChange={(e) => setGroupNumber(e.target.value)} 
              required 
              min="1"
            />
            </div>
          )}

          <button 
            type="submit" 
            className="w-full bg-northeasternWhite text-northeasternRed font-semibold px-4 py-3 rounded-md hover:bg-northeasternRed hover:bg-northeasternWhite transition"
          >
            Submit
          </button>
        </form>
        {message && <p className="mt-4 text-green-600 font-semibold text-center">{message}</p>}
        {error && <p className="mt-4 text-red-600 font-semibold text-center">{error}</p>}
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