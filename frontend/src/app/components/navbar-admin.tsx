"use client" // Declares that this page is a client component
import React from "react"; // Importing React
import Link from "next/link"; // Importing Link for client-side navigation
import { useState } from "react"; // Importing useState for managing state

const NavbarAdmin = () => {

  // State variable to manage the open/close state of the dropdown menu
  const [isOpen, setIsOpen] = useState(false);
  return (
    <nav className="navbar">
      <div className="bg-northeasternBlack text-northeasternWhite flex items-center justify-between px-6 py-4 font-rubik border-b-4 border-northeasternRed">
        <div
          className="relative flex flex-col space-y-1 ml-4 cursor-pointer group"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="absolute top-0 w-5 h-1 bg-northeasternRed rounded-full transition-all group-hover:w-7"></div>
          <div className="absolute top-0.5 w-4 h-1 bg-northeasternRed rounded-full transition-all group-hover:w-7"></div>
          <div className="absolute top-2 w-3 h-1 bg-northeasternRed rounded-full transition-all group-hover:w-7"></div>
        </div>

        {isOpen && (
          <div className="absolute top-12 left-2 bg-northeasternWhite w-48 rounded-md shadow-lg p-3 transition-all duration-300 ease-in-out border-2 border-northeasternRed">
            <Link
              href="/advisor-dashboard"
              className="block px-4 py-2 font-rubik text-northeasternBlack hover:bg-northeasternRed hover:text-northeasternWhite rounded-md"
            >
              Dashboard
            </Link>
            <Link
              href="/userProfile"
              className="block px-4 py-2 font-rubik text-northeasternBlack hover:bg-northeasternRed hover:text-northeasternWhite rounded-md"
            >
              Profile
            </Link>

            <Link
              href="/grouping"
              className="block px-4 py-2 text-northeasternBlack hover:bg-northeasternRed hover:text-northeasternWhite rounded-md"
            >
              Create and View Groups
            </Link>

            <Link
              href="/sendpopups"
              className="block px-4 py-2 text-northeasternBlack hover:bg-northeasternRed hover:text-northeasternWhite rounded-md"
            >
              Send Popups
            </Link>

            <Link
              href="/new-pdf"
              className="block px-4 py-2 text-northeasternBlack hover:bg-northeasternRed hover:text-northeasternWhite rounded-md"
            >
              Upload Jobs and Resumes
            </Link>
          </div>
        )}
        <Link
          href="/advisor-dashboard"
          className="text-3xl font-rubik font-bold text-northeasternRed drop-shadow-lg"
        >
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
    </nav>
  );
};

export default NavbarAdmin;