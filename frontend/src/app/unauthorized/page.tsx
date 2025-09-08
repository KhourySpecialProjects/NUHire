'use client';
import React from "react";
import { useRouter } from "next/navigation";
import Slideshow from "../components/slideshow";

export default function Unauthorized() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Slideshow Background */}
      <Slideshow />

      {/* Semi-transparent overlay for better text readability */}
      <div className="absolute inset-0 bg-sand/70 z-1" />

      <div className="bg-white p-8 rounded-lg shadow-md flex flex-col gap-4 w-full max-w-sm z-10 items-center">
        <h2 className="text-2xl font-bold text-center text-northeasternRed">Unauthorized</h2>
        <p className="text-center text-gray-700">
          You do not have permission to access this page.
        </p>
        <button
          onClick={() => router.push("/")}
          className="bg-navy text-white py-2 px-4 rounded hover:bg-navy/80 transition mt-4"
        >
          Go Back to Home
        </button>
      </div>
    </div>
  );
}