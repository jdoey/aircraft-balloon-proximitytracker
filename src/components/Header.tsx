"use client";

import React from "react";

const RadioTowerIcon: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="lucide lucide-radio-tower mr-3 text-cyan-400"
  >
    <path d="M4.9 16.1C1 12.2 1 5.8 4.9 1.9" />
    <path d="M7.8 4.7a6.24 6.24 0 0 1 0 8.8" />
    <path d="M10.6 7.6c.8.8.8 2.2 0 3" />
    <path d="M19.1 1.9c3.9 3.9 3.9 10.2 0 14.1" />
    <path d="M16.2 4.7a6.24 6.24 0 0 0 0 8.8" />
    <path d="M13.4 7.6c-.8.8-.8 2.2 0 3" />
    <path d="M12 22V12" />
    <path d="m9 12 3-8 3 8" />
    <path d="M9.5 12h5" />
  </svg>
);

const Header: React.FC<{ statusText: string }> = ({ statusText }) => (
  <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 p-4 z-20 shrink-0">
    <div className="container mx-auto flex justify-between items-center">
      <h1 className="text-xl md:text-2xl font-bold text-white flex items-center">
        <RadioTowerIcon /> Proximity Tracker
      </h1>
      <div className="text-sm text-gray-400 flex items-center">
        <span>{statusText}</span>
      </div>
    </div>
  </header>
);

export default Header;
