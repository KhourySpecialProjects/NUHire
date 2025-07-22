'use client';
import Image from "next/image";
import React from "react";
import './globals.css';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;


export default function Home() {
  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  return (
    <div className={'flex flex-col min-h-screen items-center justify-center bg-sand font-rubik'}>

      {/* Navigation Bar */}
      <div className="w-full flex justify-end p-2 bg-navy shadow-md font-rubik text-2xl fixed top-0">
        <button 
          onClick={handleGoogleLogin} 
          className="m-2 px-2 py-2 bg-wood text-black border-4 border-sand rounded-md text-lg transition-opacity hover:opacity-60 active:opacity-30"
        >
          Login
        </button>
      </div>

      {/* <div className="mt-20 mb-4">
        <Image
          src="/nuhire_vector.png"
          alt="Project Mascot"
          width={300}
          height={300}
          priority
        />
      </div> */}

      <main className="bg-sand justify-center items-center flex flex-col p-10 font-rubik">
        <div className="flex flex-col items-center justify-center gap-2">
          {/* Acronym with aligned words */}
          <link href="https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@700&display=swap" rel="stylesheet" />
          <style>{`.font-mono-acronym { font-family: 'Roboto Mono', monospace; }`}</style>
          <div className="flex flex-col items-start">
            <div className="flex items-end">
              <span className="text-7xl font-extrabold text-northeasternRed leading-none mr-0 font-mono-acronym align-bottom">N</span>
              <span className="text-3xl font-bold text-navy pb-0 align-bottom">ortheastern</span>
            </div>
            <div className="flex items-end">
              <span className="text-7xl font-extrabold text-northeasternRed leading-none mr-0 font-mono-acronym align-bottom">U</span>
              <span className="text-3xl font-bold text-navy pb-0 align-bottom">niversity's</span>
            </div>
            <div className="flex items-end">
              <span className="text-7xl font-extrabold text-northeasternRed leading-none mr-0 font-mono-acronym align-bottom">H</span>
              <span className="text-3xl font-bold text-navy pb-0 align-bottom">iring</span>
            </div>
            <div className="flex items-end">
              <span className="text-7xl font-extrabold text-northeasternRed leading-none mr-0 font-mono-acronym align-bottom">I</span>
              <span className="text-3xl font-bold text-navy pb-0 align-bottom">nterviewing</span>
            </div>
            <div className="flex items-end">
              <span className="text-7xl font-extrabold text-northeasternRed leading-none mr-0 font-mono-acronym align-bottom">R</span>
              <span className="text-3xl font-bold text-navy pb-0 align-bottom">ecruiting</span>
            </div>
            <div className="flex items-end">
              <span className="text-7xl font-extrabold text-northeasternRed leading-none mr-0 font-mono-acronym align-bottom">E</span>
              <span className="text-3xl font-bold text-navy pb-0 align-bottom">xercise</span>
            </div>
          </div>
        </div>
        <p className="text-2xl italic mt-8 text-center">Step into the employer's shoes!</p>
        <button 
          onClick={handleGoogleLogin} 
          className="mt-8 px-6 py-4 bg-white text-northeasternRed border-4 border-northeasternRed rounded-md text-xl font-bold transition-opacity hover:opacity-60 active:opacity-30"
        >
          Click Here to Get Started
        </button>
      </main>

      <footer className="w-full flex justify-center p-2 bg-navy shadow-md font-rubik text-2xl fixed bottom-0">
        <a
          className="flex items-center text-wood hover:text-blue-700 transition"
          href="https://discord.gg/XNjg2VMR"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image src="/discord.svg" alt="Discord icon" width={25} height={25} />
          <span>Join our Discord</span>
        </a>
      </footer>
    </div>
  );
}
