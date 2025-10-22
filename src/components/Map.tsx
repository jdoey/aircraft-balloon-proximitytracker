"use client";

import { useEffect, useRef, useState } from "react";
import type { Balloon, Plane } from "@/lib/types";

// Declare L as a global variable provided by the Leaflet script
// Also declare the markerClusterGroup property added by the plugin
declare const L: any & { markerClusterGroup: (options?: any) => any };

interface MapProps {
  balloons: Balloon[];
  planes: Plane[];
  selectedBalloon: Balloon | null;
  closestPlane: Plane | null;
}

// Helper to create Leaflet DivIcons from SVG strings
const createLeafletIcon = (svg: string, size: [number, number] = [24, 24]) => {
  // Check if L exists *before* trying to use it
  if (typeof L === "undefined" || !L || !L.divIcon) return null;
  return L.divIcon({
    html: svg,
    className: "bg-transparent border-0", // Important for styling
    iconSize: size,
    iconAnchor: [size[0] / 2, size[1] / 2], // Center the icon
  });
};

// Define icons using the helper - Moved inside component or delay creation until L is ready
// Since createLeafletIcon depends on L, we should create these dynamically inside useEffect or check L exists

const MapComponent: React.FC<MapProps> = ({
  balloons,
  planes,
  selectedBalloon,
  closestPlane,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null); // Use 'any' for Leaflet instance
  const balloonClusterGroupRef = useRef<any>(null); // Ref for the balloon cluster group
  const planeClusterGroupRef = useRef<any>(null); // Ref for the plane cluster group
  const polylineLayerRef = useRef<any>(null); // Ref for the polyline layer
  const [leafletReady, setLeafletReady] = useState(false); // State for Leaflet load
  const [clusterPluginReady, setClusterPluginReady] = useState(false); // State to track plugin load
  // Removed customClusterStyleRef

  // Effect to load Leaflet CSS and JS FIRST
  useEffect(() => {
    let isMounted = true;
    const elementsToRemove: HTMLElement[] = [];

    const loadLeaflet = async () => {
      // Load CSS
      const leafletCss = document.createElement("link");
      leafletCss.rel = "stylesheet";
      leafletCss.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(leafletCss);
      elementsToRemove.push(leafletCss);

      // Load Script
      if (typeof L === "undefined") {
        const leafletScript = document.createElement("script");
        leafletScript.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        leafletScript.async = true;
        document.head.appendChild(leafletScript);
        elementsToRemove.push(leafletScript);

        leafletScript.onload = () => {
          if (isMounted && typeof L !== "undefined") {
            console.log("Leaflet script loaded successfully.");
            setLeafletReady(true); // Signal Leaflet is ready
          } else if (isMounted) {
            console.error("Leaflet script loaded, but L is still undefined.");
          }
        };
        leafletScript.onerror = () => {
          console.error("Failed to load Leaflet script.");
        };
      } else {
        // Leaflet was already loaded
        if (isMounted) setLeafletReady(true);
      }
    };

    loadLeaflet();

    return () => {
      isMounted = false;
      elementsToRemove.forEach((el) => {
        if (document.head.contains(el)) {
          document.head.removeChild(el);
        }
      });
      // Cleanup map instance if it exists when component unmounts
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []); // Run once on mount

  // Effect to load MarkerCluster CSS and JS AFTER Leaflet is ready
  useEffect(() => {
    if (!leafletReady) return; // Wait for Leaflet

    let isMounted = true;
    const elementsToRemove: HTMLElement[] = [];

    const loadMarkerCluster = async () => {
      // Load CSS
      const clusterCss = document.createElement("link");
      clusterCss.rel = "stylesheet";
      clusterCss.href =
        "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css";
      document.head.appendChild(clusterCss);
      elementsToRemove.push(clusterCss);

      const clusterDefaultCss = document.createElement("link");
      clusterDefaultCss.rel = "stylesheet";
      clusterDefaultCss.href =
        "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css";
      document.head.appendChild(clusterDefaultCss);
      elementsToRemove.push(clusterDefaultCss);

      // *** REMOVED Custom CSS Injection ***

      // Load Script
      if (!L.markerClusterGroup) {
        const clusterScript = document.createElement("script");
        clusterScript.src =
          "https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js";
        clusterScript.async = true;
        document.head.appendChild(clusterScript);
        elementsToRemove.push(clusterScript);

        clusterScript.onload = () => {
          if (typeof L !== "undefined" && L.markerClusterGroup && isMounted) {
            console.log("MarkerCluster script loaded successfully.");
            setClusterPluginReady(true); // Signal plugin is ready
          } else if (isMounted) {
            console.error(
              "MarkerCluster script loaded, but L.markerClusterGroup is not defined."
            );
          }
        };
        clusterScript.onerror = () => {
          console.error("Failed to load MarkerCluster script.");
        };
      } else {
        // Plugin already loaded
        if (isMounted) setClusterPluginReady(true);
      }
    };

    loadMarkerCluster();

    return () => {
      isMounted = false;
      elementsToRemove.forEach((el) => {
        if (document.head.contains(el)) {
          document.head.removeChild(el);
        }
      });
      // Cleanup cluster groups
      if (mapInstanceRef.current) {
        if (balloonClusterGroupRef.current) {
          if (mapInstanceRef.current.hasLayer(balloonClusterGroupRef.current)) {
            mapInstanceRef.current.removeLayer(balloonClusterGroupRef.current);
          }
          balloonClusterGroupRef.current = null;
        }
        if (planeClusterGroupRef.current) {
          if (mapInstanceRef.current.hasLayer(planeClusterGroupRef.current)) {
            mapInstanceRef.current.removeLayer(planeClusterGroupRef.current);
          }
          planeClusterGroupRef.current = null;
        }
        if (polylineLayerRef.current) {
          if (mapInstanceRef.current.hasLayer(polylineLayerRef.current)) {
            mapInstanceRef.current.removeLayer(polylineLayerRef.current);
          }
          polylineLayerRef.current = null;
        }
      }
    };
  }, [leafletReady]); // Run when Leaflet becomes ready

  // Initialize map instance effect (depends on Leaflet being ready)
  useEffect(() => {
    // Ensure Leaflet is loaded and map isn't already initialized
    if (leafletReady && mapRef.current && !mapInstanceRef.current) {
      console.log("Initializing Leaflet map...");
      mapInstanceRef.current = L.map(mapRef.current).setView([20, 0], 2);
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 19,
        }
      ).addTo(mapInstanceRef.current);

      // Initialize the polyline layer
      polylineLayerRef.current = L.layerGroup().addTo(mapInstanceRef.current);
    }
  }, [leafletReady]); // Depends on leafletReady

  // Initialize Cluster Groups Effect (depends on map and plugin being ready)
  useEffect(() => {
    // Ensure map instance and plugin are ready
    if (leafletReady && clusterPluginReady && mapInstanceRef.current) {
      // Initialize balloon cluster group if not already done
      if (!balloonClusterGroupRef.current) {
        console.log("Initializing Balloon MarkerClusterGroup...");
        balloonClusterGroupRef.current = L.markerClusterGroup({
          chunkedLoading: true,
          maxClusterRadius: 60,
          // *** REMOVED className: 'balloon-cluster' ***
        });
        mapInstanceRef.current.addLayer(balloonClusterGroupRef.current);
      }
      // Initialize plane cluster group if not already done
      if (!planeClusterGroupRef.current) {
        console.log("Initializing Plane MarkerClusterGroup...");
        planeClusterGroupRef.current = L.markerClusterGroup({
          chunkedLoading: true,
          maxClusterRadius: 40, // Potentially smaller radius for planes
        });
        mapInstanceRef.current.addLayer(planeClusterGroupRef.current);
      }
    }
  }, [leafletReady, clusterPluginReady]); // Run when clusterPluginReady or leafletReady state changes

  // Update markers and polyline effect
  useEffect(() => {
    // Ensure all dependencies are ready before proceeding
    if (
      !leafletReady ||
      !clusterPluginReady ||
      !mapInstanceRef.current ||
      !balloonClusterGroupRef.current ||
      !planeClusterGroupRef.current ||
      !polylineLayerRef.current
    ) {
      return;
    }

    const balloonClusterGroup = balloonClusterGroupRef.current;
    const planeClusterGroup = planeClusterGroupRef.current;
    const polylineLayer = polylineLayerRef.current;
    const map = mapInstanceRef.current;

    // Create icons dynamically within the effect, ensuring L is defined
    const ICONS_LOCAL = {
      BALLOON: createLeafletIcon(
        `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#06b6d4" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="1"/></svg>`
      ),
      SELECTED_BALLOON: createLeafletIcon(
        `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="#06b6d4" stroke="#ffffff" stroke-width="2" class="animate-pulse"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="1"/></svg>`,
        [36, 36]
      ),
      PLANE: createLeafletIcon(
        `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#facc15" stroke="#000000" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plane"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>`
      ),
      CLOSEST_PLANE: createLeafletIcon(
        `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="#facc15" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plane animate-pulse"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>`,
        [36, 36]
      ),
    };

    balloonClusterGroup.clearLayers(); // Clear previous balloon markers
    planeClusterGroup.clearLayers(); // Clear previous plane markers
    polylineLayer.clearLayers(); // Clear previous polyline

    const balloonMarkersToAdd: any[] = [];
    const planeMarkersToAdd: any[] = [];

    // Add balloon markers
    balloons.forEach((b) => {
      const isSelected = selectedBalloon?.id === b.id;
      const iconDefinition = isSelected
        ? ICONS_LOCAL.SELECTED_BALLOON
        : ICONS_LOCAL.BALLOON;
      // Stricter check for valid number coordinates
      if (
        iconDefinition &&
        typeof b.lat === "number" &&
        typeof b.lon === "number"
      ) {
        const marker = L.marker([b.lat, b.lon], {
          icon: iconDefinition,
          zIndexOffset: isSelected ? 1000 : 0,
        }).bindPopup(
          `<b>Balloon ID:</b> ${b.id}<br><b>Alt:</b> ${
            b.alt ? (b.alt / 1000).toFixed(2) + " km" : "N/A"
          }`
        );
        balloonMarkersToAdd.push(marker);
      }
    });

    // Add plane markers
    planes.forEach((p) => {
      const isClosest = closestPlane?.icao24 === p.icao24;
      const iconDefinition = isClosest
        ? ICONS_LOCAL.CLOSEST_PLANE
        : ICONS_LOCAL.PLANE;
      // Stricter check for valid number coordinates
      if (
        iconDefinition &&
        typeof p.lat === "number" &&
        typeof p.lon === "number"
      ) {
        const marker = L.marker([p.lat, p.lon], {
          icon: iconDefinition,
          zIndexOffset: isClosest ? 1000 : 0,
        }).bindPopup(
          `<b>Callsign:</b> ${p.callsign || "N/A"}<br><b>Country:</b> ${
            p.origin_country
          }<br><b>Alt:</b> ${
            p.baro_altitude
              ? (p.baro_altitude / 1000).toFixed(2) + " km"
              : "N/A"
          }`
        );
        planeMarkersToAdd.push(marker);
      }
    });

    // Add markers in bulk to their respective cluster groups
    if (balloonMarkersToAdd.length > 0) {
      balloonClusterGroup.addLayers(balloonMarkersToAdd);
    }
    if (planeMarkersToAdd.length > 0) {
      planeClusterGroup.addLayers(planeMarkersToAdd);
    }

    // Draw line and adjust view
    // Ensure both objects and their coordinates are valid numbers before proceeding
    if (
      selectedBalloon &&
      closestPlane &&
      typeof selectedBalloon.lat === "number" &&
      typeof selectedBalloon.lon === "number" &&
      typeof closestPlane.lat === "number" &&
      typeof closestPlane.lon === "number"
    ) {
      // Now safe to use coordinates
      L.polyline(
        [
          [selectedBalloon.lat, selectedBalloon.lon],
          [closestPlane.lat, closestPlane.lon],
        ],
        { color: "cyan", weight: 2, opacity: 0.8, dashArray: "5, 10" }
      ).addTo(polylineLayer);

      try {
        const bounds = L.latLngBounds([
          [selectedBalloon.lat, selectedBalloon.lon],
          [closestPlane.lat, closestPlane.lon],
        ]);
        map.flyToBounds(bounds.pad(0.5), { duration: 1 });
      } catch (e) {
        // Catch potential Leaflet internal errors just in case
        console.error("Error during flyToBounds:", e, {
          selectedBalloon,
          closestPlane,
        });
      }
    } else if (
      selectedBalloon &&
      typeof selectedBalloon.lat === "number" &&
      typeof selectedBalloon.lon === "number"
    ) {
      // Fly to balloon only if coordinates are valid numbers
      map.flyTo([selectedBalloon.lat, selectedBalloon.lon], 5, { duration: 1 });
    }
  }, [
    balloons,
    planes,
    selectedBalloon,
    closestPlane,
    leafletReady,
    clusterPluginReady,
  ]); // Dependencies

  // Render loading state or map container
  return (
    <div id="map" ref={mapRef} className="flex-grow w-full h-full">
      {!leafletReady && (
        <div className="absolute inset-0 bg-gray-900 flex items-center justify-center z-50">
          <p>Loading Map Library...</p>
        </div>
      )}
    </div>
  );
};

export default MapComponent;
