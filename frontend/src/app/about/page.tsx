"use client";
import React, { useState } from "react";
import Slideshow from "../components/slideshow";
import Image from "next/image";

export default function AboutPage() {
  const [loading, setLoading] = useState(true);
  const FRONT_URL = process.env.NEXT_PUBLIC_FRONT_URL || "http://localhost:3000";

  const handleContinue = () => {
    console.log("Continuing to instructions page");
    window.location.href = `${FRONT_URL}/instructions`;
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden font-rubik flex flex-col">
      <div className="fixed inset-0 z-0">
        <Slideshow />
      </div>
      
      <div className="fixed inset-0 bg-sand/80 z-5" />

      <div className="w-full flex justify-center p-4 bg-navy/90 backdrop-blur-sm shadow-md font-rubik text-lg z-20">
        <h1 className="text-6xl font-extrabold mb-1 text-northeasternRed">NUHire</h1>
      </div>

      <div className="relative z-100 flex flex-col items-center flex-grow">
        <div className="flex flex-col items-center text-redHeader text-center space-y-2 mb-2 mt-4">
          <h1 className="text-4xl font-extrabold mb-1">Welcome to NUHire</h1>
          <p className="text-lg text-gray-800 mb-2">Work in small teams to experience what it's like to be a hiring manager.</p>
          <p className="text-lg text-gray-800">Review a job description, evaluate resumes, and decide which candidates deserve an interview.</p>
          <p className="text-lg text-gray-800">Then, watch interview clips and choose the top two finalists for the role.</p>
          <p className="text-lg text-gray-800">Who will your group select to be your NUHire?</p>
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
          className="px-6 py-4 bg-navy text-sand border-4 border-navy rounded-md text-xl font-bold transition-opacity hover:opacity-60 active:opacity-30 my-8"
        >
          Continue to Instructions
        </button>
      </div>

      {/* Footer - no longer fixed */}
      <footer className="w-full flex justify-center p-2 bg-navy/90 backdrop-blur-sm shadow-md font-rubik text-2xl z-20">
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