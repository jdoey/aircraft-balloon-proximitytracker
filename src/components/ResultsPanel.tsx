"use client";

import React from "react";
import type { Balloon, Plane } from "@/lib/types";

interface ResultsPanelProps {
  balloon: Balloon | null;
  plane: Plane | null;
  distance: number | null;
}

const ResultsPanel: React.FC<ResultsPanelProps> = ({
  balloon,
  plane,
  distance,
}) => {
  if (!balloon) return null;

  const balloonAlt = balloon.alt
    ? `${(balloon.alt / 1000).toFixed(2)} km`
    : "N/A";
  const planeAlt = plane?.baro_altitude
    ? `${(plane.baro_altitude / 1000).toFixed(2)} km`
    : "N/A";

  return (
    <div className="bg-gray-900/80 backdrop-blur-sm p-4 border-t-2 border-cyan-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
        <div>
          <h3 className="font-bold text-cyan-400 text-lg">Selected Balloon</h3>
          <p>
            ID: <span className="font-mono">{balloon.id}</span>
          </p>
          <p>
            Altitude: <span className="font-mono">{balloonAlt}</span>
          </p>
        </div>
        {plane ? (
          <>
            <div>
              <h3 className="font-bold text-yellow-400 text-lg">
                Closest Aircraft
              </h3>
              <p>
                Callsign: <span className="font-mono">{plane.callsign}</span>
              </p>
              <p>
                Altitude: <span className="font-mono">{planeAlt}</span>
              </p>
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">Proximity</h3>
              <p className="text-2xl font-bold text-cyan-300">
                {distance?.toFixed(2)} km
              </p>
              <p className="text-sm text-gray-400">Horizontal distance</p>
            </div>
          </>
        ) : (
          <div className="md:col-span-2 flex items-center justify-center">
            <p className="text-gray-400">No planes found in the dataset.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsPanel;
