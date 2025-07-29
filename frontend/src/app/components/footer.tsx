"use client";

import { FaDiscord } from "react-icons/fa";
import Link from "next/link";

const Footer: React.FC = () => {
  return (
    <footer className="text-center p-5 bg-northeasternBlack text-northeasternRed">
      <div className="flex items-center justify-center font-rubik font-extrabold">
        <Link href="https://discord.gg/XNjg2VMR" className="flex items-center space-x-2 text-northeasternRed">
          <FaDiscord size={24} />
          <span>Join our Discord</span>
        </Link>
      </div>
      <div className="mt-2">
        <a
          href="https://www.northeastern.edu"
          target="_blank"
          rel="noopener noreferrer"
          className="font-rubik text-northeasternRed font-extrabold"
        >
          Northeastern Home Page
        </a>
      </div>
    </footer>
  );
};

export default Footer;