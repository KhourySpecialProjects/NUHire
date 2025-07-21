"use client";

import React from "react";

interface PopupProps {
  headline: string;
  message: string;
  onDismiss: () => void;
}

const Popup = ({ headline, message, onDismiss }: PopupProps) => {
  return (
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-springWater p-8 w-96 rounded-md shadow-lg z-50">
      <h2 className="font-bold text-redHeader text-2xl mb-4">{headline}</h2>
      <p className="text-navy text-lg mb-6">{message}</p>
      <button
        onClick={onDismiss}
        className="w-full px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
      >
        Dismiss
      </button>
    </div>
  );
};

export default Popup;