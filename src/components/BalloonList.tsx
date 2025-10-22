"use client";

import React from "react";
import type { Balloon } from "@/lib/types";

interface BalloonListProps {
  balloons: Balloon[];
  onSelect: (id: string) => void;
  selectedId: string | null;
}

const BalloonList: React.FC<BalloonListProps> = ({
  balloons = [],
  onSelect,
  selectedId,
}) => (
  <aside className="w-full md:w-1/3 lg:w-1/4 bg-gray-800/80 p-4 overflow-y-auto flex flex-col">
    <h2 className="text-lg font-semibold mb-3 border-b border-gray-700 pb-2">
      Weather Balloons
    </h2>
    <div className="space-y-2 flex-1">
      {balloons.length > 0 ? (
        balloons.map((balloon) => (
          <button
            key={balloon.id}
            onClick={() => onSelect(balloon.id)}
            className={`w-full text-left p-2 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
              selectedId === balloon.id
                ? "bg-cyan-700 text-white"
                : "bg-gray-700 hover:bg-cyan-800/50"
            }`}
          >
            ID: {balloon.id}
          </button>
        ))
      ) : (
        <p className="text-gray-500">No balloon data found.</p>
      )}
    </div>
  </aside>
);

export default BalloonList;
