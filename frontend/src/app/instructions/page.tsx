"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Slideshow from "../components/slideshow"; 

export default function InstructionsPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const FRONT_URL = process.env.NEXT_PUBLIC_FRONT_URL;
  const API_BASE_URL = "https://nuhire-api-cz6c.onrender.com";

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/user`, { credentials: "include" });
        const userData = await response.json();

        if (response.ok) {
          setName(userData.f_name + " " + userData.l_name);
          setEmail(userData.email); // Set the email from userData
        } else {
          setName("");
          setEmail("");
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  const updateUserSeeDash = async () => {
    try {
      console.log("Updating user-see-dash field for email:", email);
      
      const response = await fetch(`${API_BASE_URL}/users/update-seen`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email
        }),
      });

      console.log("Response from update-seen endpoint:", response);
      if (response.ok) {
        const result = await response.json();
        console.log("Successfully updated user-see-dash field:", result);
        return true;
      } else {
        console.error("Failed to update user-see-dash field:", response.statusText);
        return false;
      }
    } catch (error) {
      console.error("Error updating user-see-dash field:", error);
      return false;
    }
  };

  const handleContinue = async () => {
    await updateUserSeeDash();
    window.location.href = `https://nuhire-wgez.onrender.com/dashboard?name=${encodeURIComponent(name)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-sand">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Loading...</h2>
          <div className="w-16 h-16 border-t-4 border-navy border-solid rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }  

  return (
    <div className="flex flex-col min-h-screen bg-sand font-rubik">
      <div className="fixed inset-0 z-0">
        <Slideshow />
      </div>
            
      <div className="fixed inset-0 bg-sand/80 z-5" />
      
      <div className="z-10 flex flex-col items-center relative flex-grow p-8 overflow-y-auto">
        <h1 className="text-4xl font-extrabold text-northeasternRed mb-8 text-center">NUHire Progress Steps</h1>
        <h2 className="text-3xl font-extrabold text-northeasternBlack mb-8 text-center">In the shoes of an employer, you will go through the following steps:</h2>
        <div className="max-w-2xl w-full space-y-8 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-md p-6 border-l-8 border-northeasternRed">
            <h2 className="text-2xl font-bold mb-2"><span className="text-northeasternRed">1.</span> <span className="text-navy">Job Description</span></h2>
            <p className="text-gray-800">Your group will be assigned a real job description. Read it carefully to understand the role and what the employer is looking for in a candidate.</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border-l-8 border-northeasternRed">
            <h2 className="text-2xl font-bold mb-2"><span className="text-northeasternRed">2.</span> <span className="text-navy">Resume Review</span></h2>
            <p className="text-gray-800">Individually, you'll review a set of candidate resumes. Mark which ones you think are strong fits for the job. Your group will later discuss and compare your choices.</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border-l-8 border-northeasternRed">
            <h2 className="text-2xl font-bold mb-2"><span className="text-northeasternRed">3.</span> <span className="text-navy">Group Resume Review</span></h2>
            <p className="text-gray-800">As a team, you'll discuss your individual resume picks and decide together which candidates should move forward to the interview stage.</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border-l-8 border-northeasternRed">
            <h2 className="text-2xl font-bold mb-2"><span className="text-northeasternRed">4.</span> <span className="text-navy">Interview Stage</span></h2>
            <p className="text-gray-800">Watch short video interviews of the selected candidates. Rate their responses and discuss as a group who impressed you most.</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border-l-8 border-northeasternRed">
            <h2 className="text-2xl font-bold mb-2"><span className="text-northeasternRed">5.</span> <span className="text-navy">Make Offer</span></h2>
            <p className="text-gray-800">Your group will choose the candidate that gets a job offer for the role and submit your hiring decision.</p>
          </div>
        </div>
        <button
          onClick={handleContinue}
          className="mt-10 mb-16 px-6 py-4 bg-navy text-sand border-4 border-navy rounded-md text-xl font-bold transition-opacity hover:opacity-60 active:opacity-30"
          disabled={loading || !name}
        >
          Continue to Dashboard
        </button>
      </div>
      
      <footer className="w-full flex justify-center p-2 bg-navy/90 backdrop-blur-sm shadow-md font-rubik text-2xl z-20">
        <a
          className="flex items-center text-wood hover:text-blue-300 transition-colors duration-200"
          href="https://discord.com/invite/jyvzqyJHy6"
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