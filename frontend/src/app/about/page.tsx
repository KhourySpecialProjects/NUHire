
"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AboutPage() {
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
    <div className="flex flex-col min-h-screen items-center bg-sand font-rubik">
      {/* Spacer to move content lower */}
      <div className="h-16" />
      <div className="flex flex-col items-center text-redHeader text-center space-y-2 mb-2">
        <h1 className="text-4xl font-extrabold mb-1">Welcome to NUHire</h1>
        <p className="text-lg text-gray-800 mb-2">Work in small teams to experience what it’s like to be a hiring manager.</p>
      </div>
      <div className="flex flex-col items-center text-redHeader text-center space-y-4 mb-6">
        <p className="text-lg text-gray-800">Review a job description, evaluate resumes, and decide which candidates deserve an interview.</p>
        <p className="text-lg text-gray-800">Then, watch interview clips and choose the top two finalists for the role.</p>
        <p className="text-lg text-gray-800">Who will your group select to be your NUHire?</p>
      </div>
      <div className="flex flex-col items-center text-center p-6">
        <p className="text-xl font-rubik mb-4">An Applicant Tracking System (ATS) is a software that streamlines the hiring process by automating tasks like resume screening and applicant tracking. It helps organizations manage the flow of applications and identify qualified candidates.</p>
        <h1 className="text-2xl font-rubik font-bold mb-4">Before you get started on this activity, watch the short video below:</h1>
        <div className="w-full max-w-5xl aspect-video border-4 border-[#1c2a63] mb-5 rounded-lg shadow-lg">
          <iframe
            className="w-full h-full rounded-lg shadow-lg"
            src="https://www.youtube.com/embed/fHpVPkIGVyY?si=9L9JBYH8sWTEZYe6"
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          ></iframe>
        </div>
      </div>
      <button
        onClick={handleContinue}
        className="px-6 py-4 bg-navy text-sand border-4 border-navy rounded-md text-xl font-bold transition-opacity hover:opacity-60 active:opacity-30"
        disabled={!name}
      >
        Continue to Dashboard
      </button>
      {/* Spacer below button */}
      <div className="h-16" />
    </div>
  );
}
