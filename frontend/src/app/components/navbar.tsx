"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Code for user progress 
  const [progress, setProgress] = useState<string>("job-description");
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedProgress = localStorage.getItem("progress") || "job-description";
      setProgress(storedProgress);
      
    }
  }, []);
  const steps = [
    { key: "jobdes", label: "Job Description", path: "/jobdes" },
    { key: "res-review", label: "Resume Review", path: "/res-review" },
    { key: "res-review-group", label: "Resume Review Group", path: "/res-review-group" },
    { key: "interview-stage", label: "Interview Stage", path: "/interview-stage" },
    { key: "makeOffer", label: "Make an Offer", path: "/makeOffer" },
    { key: "employerPannel", label: "Employer Panel", path: "/employerPannel" },
  ];

  const isStepUnlocked = (stepKey: string) => {
    const completedSteps = steps.map(s => s.key);
    return completedSteps.indexOf(stepKey) <= completedSteps.indexOf(progress);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const router = useRouter();

  return (
    <nav className="navbar w-full relative">
      {/* Top bar */}
      <div className="bg-northeasternBlack text-northeasternWhite flex items-center justify-between px-6 py-4 font-rubik border-b-4 border-northeasternRed w-full">
        <button
          className="flex items-center gap-2 font-bold text-xl focus:outline-none"
          onClick={() => setIsOpen((open) => !open)}
        >
          <span>Menu</span>
          <span className={`transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>▶</span>
        </button>
        <Link href="/dashboard" className="text-4xl font-rubik font-bold text-northeasternRed drop-shadow-lg">
          NUHire
        </Link>
        <Link
          href="/userProfile"
          className="flex items-center justify-center w-10 h-10 rounded-full bg-northeasternRed cursor-pointer transition duration-300 ease-in-out hover:bg-northeasternBlack hover:border-2 hover:border-northeasternRed relative"
        >
          <div
            className="w-6 h-6 bg-cover bg-center rounded-full border-2 border-northeasternWhite"
            style={{
              backgroundImage:
                "url('https://cdn-icons-png.flaticon.com/512/847/847969.png')",
            }}
          >
            {" "}
          </div>
        </Link>
      </div>
      {/* Collapsible sidebar - slides in from the left */}
      <div
        ref={dropdownRef}
        className={`fixed top-0 left-0 h-full z-50 bg-northeasternWhite shadow-lg transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} w-64 border-r-4 border-northeasternRed`}
        style={{ borderTopRightRadius: isOpen ? '1rem' : '0', borderBottomRightRadius: isOpen ? '1rem' : '0' }}
      >
        <div className="flex flex-col gap-2 pt-24 px-6">
          <span className="font-bold text-xl text-northeasternRed mb-2">Menu</span>
          <button
            className="self-end text-xl text-gray-500 hover:text-northeasternRed mb-2"
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
          <button
            className="block px-4 py-2 font-rubik text-northeasternRed hover:bg-northeasternRed hover:text-northeasternWhite rounded-md text-left"
            onClick={() => { setIsOpen(false); router.push("/dashboard"); }}
          >
            Dashboard
          </button>
          <button
            className="block px-4 py-2 font-rubik text-northeasternRed hover:bg-northeasternRed hover:text-northeasternWhite rounded-md text-left"
            onClick={() => { setIsOpen(false); router.push("/userProfile"); }}
          >
            Profile
          </button>
          <button
            className="block px-4 py-2 font-rubik text-northeasternRed hover:bg-northeasternRed hover:text-northeasternWhite rounded-md text-left"
            onClick={() => { setIsOpen(false); router.push("/notes"); }}
          >
            Notes
          </button>
          {steps
            .map((step) => (
              <button
                key={step.key}
                disabled={!isStepUnlocked(step.key)}
                className={`block px-4 py-2 text-northeasternRed rounded-md text-left font-rubik transition-all
                  ${isStepUnlocked(step.key)
                    ? 'hover:bg-northeasternRed hover:text-northeasternWhite cursor-pointer opacity-100'
                    : 'bg-northeasternWhite text-northeasternRed cursor-not-allowed opacity-50'}`}
                onClick={() => {
                  if (isStepUnlocked(step.key)) {
                    setIsOpen(false);
                    router.push(step.path);
                  }
                }}
              >
                {step.label}
              </button>
            ))}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;