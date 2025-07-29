'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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

  useEffect(() => {
    // Get email from URL query parameter (passed from Google OAuth)
    const urlParams = new URLSearchParams(window.location.search);
    const userEmail = urlParams.get('email');
    if (userEmail) {
      setEmail(userEmail);
    } else {
      setError('Authentication failed. Please try again.');
    }
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
            router.push('/dashboard'); 
          } else if (affiliation === 'admin') {
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
      <h1 className="text-3xl font-bold text-navy mb-6">Complete Your Signup</h1>
  
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-navy shadow-lg rounded-lg p-6 flex flex-col gap-4">
        <input 
          type="text" 
          placeholder="First Name *" 
          className="w-full px-4 py-3 border border-wood bg-springWater rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={firstName} 
          onChange={(e) => setFirstName(e.target.value)} 
          required 
        />

        <input 
          type="text" 
          placeholder="Last Name *" 
          className="w-full px-4 py-3 border border-wood bg-springWater rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={lastName} 
          onChange={(e) => setLastName(e.target.value)} 
          required 
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
            placeholder="Group Number *" 
            className="w-full px-4 py-3 border border-wood bg-springWater rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={groupNumber} 
            onChange={(e) => setGroupNumber(e.target.value)} 
            required 
            min="1"
          />

          <input 
            type="number" 
            placeholder="CRN *" 
            className="w-full px-4 py-3 border border-wood bg-springWater rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={courseNumber} 
            onChange={(e) => setCourseNumber(e.target.value)} 
            required 
            min="1"
          />
          </div>
        )}

        <button 
          type="submit" 
          className="w-full bg-wood text-navy font-semibold px-4 py-3 rounded-md hover:bg-sand transition"
        >
          Submit
        </button>
      </form>

      {message && <p className="mt-4 text-green-600 font-semibold">{message}</p>}
      {error && <p className="mt-4 text-red-600 font-semibold">{error}</p>}
    </div>
  );
}