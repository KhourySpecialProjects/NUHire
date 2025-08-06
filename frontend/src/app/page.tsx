'use client';
import React from "react";
import Slider from "react-slick";
import Image from "next/image";
import './globals.css';
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const SLIDESHOW_IMAGES = [
  "/Khoury/1.jpg",
  "/Khoury/2.jpg",
  "/Khoury/3.jpg",
  "/Khoury/4.jpg",
  "/Khoury/5.jpg",
  "/Khoury/6.jpg",
];

export default function Home() {
  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  const sliderSettings = {
    dots: false,
    infinite: true,
    speed: 1000,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 4000,
    fade: true,
    arrows: false,
  };

  return (
    <div className="flex flex-col min-h-screen items-center justify-center font-rubik relative overflow-hidden">
      {/* Slideshow Background */}
      <div className="absolute inset-0 z-0">
        <Slider {...sliderSettings} className="h-full">
          {SLIDESHOW_IMAGES.map((image, index) => (
            <div key={index} className="h-screen">
              <div
                className="h-full bg-cover bg-center"
                style={{
                  backgroundImage: `url(${image})`,
                }}
              />
            </div>
          ))}
        </Slider>
      </div>
      
      {/* Semi-transparent overlay for better text readability */}
      <div className="absolute inset-0 bg-sand/70 z-1" />

      {/* Navigation Bar */}
      <div className="w-full flex justify-end p-8 bg-navy/90 backdrop-blur-sm shadow-md font-rubik text-2xl fixed top-0 z-20">
      </div>

      {/* Main Content */}
      <main className="relative z-10 justify-center items-center flex flex-col p-10 font-rubik">
        <div className="flex flex-col items-center justify-center gap-2">
          {/* Acronym with aligned words */}
          <div className="flex flex-col items-start p-8 rounded-2xl backdrop-blur-sm">
            <div className="flex items-end">
              <span className="text-7xl font-extrabold text-northeasternRed leading-none mr-0 font-mono align-bottom">N</span>
              <span className="text-3xl font-bold text-navy pb-0 align-bottom">ortheastern</span>
            </div>
            <div className="flex items-end">
              <span className="text-7xl font-extrabold text-northeasternRed leading-none mr-0 font-mono align-bottom">U</span>
              <span className="text-3xl font-bold text-navy pb-0 align-bottom">niversity's</span>
            </div>
            <div className="flex items-end">
              <span className="text-7xl font-extrabold text-northeasternRed leading-none mr-0 font-mono align-bottom">H</span>
              <span className="text-3xl font-bold text-navy pb-0 align-bottom">iring</span>
            </div>
            <div className="flex items-end">
              <span className="text-7xl font-extrabold text-northeasternRed leading-none mr-0 font-mono align-bottom">I</span>
              <span className="text-3xl font-bold text-navy pb-0 align-bottom">nterviewing</span>
            </div>
            <div className="flex items-end">
              <span className="text-7xl font-extrabold text-northeasternRed leading-none mr-0 font-mono align-bottom">R</span>
              <span className="text-3xl font-bold text-navy pb-0 align-bottom">ecruiting</span>
            </div>
            <div className="flex items-end">
              <span className="text-7xl font-extrabold text-northeasternRed leading-none mr-0 font-mono align-bottom">E</span>
              <span className="text-3xl font-bold text-navy pb-0 align-bottom">xercise</span>
            </div>
          </div>
        </div>
        <p className="text-2xl italic mt-8 text-center text-navy font-bold  px-6 py-3 rounded-lg backdrop-blur-sm">
          Step into the employer's shoes!
        </p>
        <button 
          onClick={handleGoogleLogin} 
          className="mt-8 px-6 py-4 bg-white text-northeasternRed border-4 border-northeasternRed rounded-md text-xl font-bold transition-all duration-200 hover:opacity-60 active:opacity-30 hover:scale-105 shadow-lg"
        >
          Click Here to Get Started
        </button>
      </main>

      {/* Footer */}
      <footer className="w-full flex justify-center p-2 bg-navy/90 backdrop-blur-sm shadow-md font-rubik text-2xl fixed bottom-0 z-20">
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

      {/* Custom styles for monospace font */}
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@700&display=swap');
        .font-mono {
          font-family: 'Roboto Mono', monospace;
        }
      `}</style>
    </div>
  );
}