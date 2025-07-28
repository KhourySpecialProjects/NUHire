"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function InstructionsPage() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const FRONT_URL = process.env.NEXT_PUBLIC_FRONT_URL || "http://localhost:3000";
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/user`, { credentials: "include" });
        const userData = await response.json();

        if (response.ok) {
          setName(userData.f_name + " " + userData.l_name);
        } else {
          setName("");
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

 const handleContinue = () => {
    window.location.href = `${FRONT_URL}/dashboard?name=${encodeURIComponent(name)}`;
  };


  return (
    <div className="flex flex-col min-h-screen items-center bg-sand font-rubik p-8">
      <h1 className="text-4xl font-extrabold text-navy mb-8">NUHire Progress Steps</h1>
      <div className="max-w-2xl w-full space-y-8">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-8 border-navy">
          <h2 className="text-2xl font-bold text-navy mb-2">1. Job Description</h2>
          <p className="text-gray-800">Your group will be assigned a real job description. Read it carefully to understand the role and what the employer is looking for in a candidate.</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 border-l-8 border-navy">
          <h2 className="text-2xl font-bold text-navy mb-2">2. Resume Review</h2>
          <p className="text-gray-800">Individually, you'll review a set of candidate resumes. Mark which ones you think are strong fits for the job. Your group will later discuss and compare your choices.</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 border-l-8 border-navy">
          <h2 className="text-2xl font-bold text-navy mb-2">3. Group Resume Review</h2>
          <p className="text-gray-800">As a team, you'll discuss your individual resume picks and decide together which candidates should move forward to the interview stage.</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 border-l-8 border-navy">
          <h2 className="text-2xl font-bold text-navy mb-2">4. Interview Stage</h2>
          <p className="text-gray-800">Watch short video interviews of the selected candidates. Rate their responses and discuss as a group who impressed you most.</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 border-l-8 border-navy">
          <h2 className="text-2xl font-bold text-navy mb-2">5. Make Offer</h2>
          <p className="text-gray-800">Your group will choose the top two finalists for the role and submit your hiring decision. See how your choices compare to other groups and real-world outcomes!</p>
        </div>
      </div>
      <button
        onClick={handleContinue}
        className="mt-10 px-6 py-4 bg-navy text-sand border-4 border-navy rounded-md text-xl font-bold transition-opacity hover:opacity-60 active:opacity-30"
        disabled={loading || !name}
      >
        Continue to Dashboard
      </button>
      <div className="h-16" />
    </div>
  );
}
