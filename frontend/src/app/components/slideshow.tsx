'use client';
import React from "react";
import Slider from "react-slick";

const SLIDESHOW_IMAGES = [
  "/Khoury/1.jpg",
  "/Khoury/2.jpg",
  "/Khoury/3.jpg",
  "/Khoury/4.jpg",
  "/Khoury/5.jpg",
  "/Khoury/6.jpg",
];

const sliderSettings = {
  dots: true,
  infinite: true,
  speed: 1000,
  slidesToShow: 1,
  slidesToScroll: 1,
  autoplay: true,
  autoplaySpeed: 3000,
  fade: true,
  arrows: false,
};

export default function Slideshow() {
  return (
    <div className="absolute inset-0 z-0 min-h-screen h-full">
      <Slider {...sliderSettings} className="h-full min-h-screen">
        {SLIDESHOW_IMAGES.map((image, index) => (
          <div key={index} className="h-full min-h-screen">
            <div
              className="w-full h-full min-h-screen bg-cover bg-center"
              style={{
                backgroundImage: `url(${image})`,
              }}
            />
          </div>
        ))}
      </Slider>
    </div>
  );
}