import type { Balloon, Plane } from "./types";

export const MOCK_PLANES: Plane[] = [
  {
    icao24: "a8a2a7",
    callsign: "SWA456",
    origin_country: "United States",
    lat: 34.1,
    lon: -118.3,
    baro_altitude: 10000,
  },
  {
    icao24: "ac9695",
    callsign: "AAL123",
    origin_country: "United States",
    lat: 40.7,
    lon: -73.9,
    baro_altitude: 9000,
  },
  {
    icao24: "406a3d",
    callsign: "BAW283",
    origin_country: "United Kingdom",
    lat: 48.9,
    lon: 2.4,
    baro_altitude: 11000,
  },
  {
    icao24: "86f336",
    callsign: "JAL789",
    origin_country: "Japan",
    lat: 35.7,
    lon: 139.8,
    baro_altitude: 12000,
  },
  {
    icao24: "7c6b3e",
    callsign: "QFA456",
    origin_country: "Australia",
    lat: -33.9,
    lon: 151.1,
    baro_altitude: 10500,
  },
  {
    icao24: "a4f8d2",
    callsign: "UAL901",
    origin_country: "United States",
    lat: 36.1699,
    lon: -115.1398,
    baro_altitude: 11500,
  },
];

// Approximate North America Bounds
// minLat: 15, maxLat: 85
// minLon: -170, maxLon: -50

export const MOCK_PLANES_NA: Plane[] = [
  // West Coast USA
  {
    icao24: "a8a2a7",
    callsign: "SWA456",
    origin_country: "United States",
    lat: 34.1,
    lon: -118.3,
    baro_altitude: 10000,
  }, // Los Angeles area
  {
    icao24: "a4f8d2",
    callsign: "UAL901",
    origin_country: "United States",
    lat: 37.7,
    lon: -122.4,
    baro_altitude: 11500,
  }, // San Francisco area
  {
    icao24: "adf9ba",
    callsign: "ASA789",
    origin_country: "United States",
    lat: 47.6,
    lon: -122.3,
    baro_altitude: 9500,
  }, // Seattle area

  // Central/Midwest USA
  {
    icao24: "ac9695",
    callsign: "AAL123",
    origin_country: "United States",
    lat: 41.8,
    lon: -87.6,
    baro_altitude: 9000,
  }, // Chicago area
  {
    icao24: "a2d7f8",
    callsign: "DAL567",
    origin_country: "United States",
    lat: 39.7,
    lon: -104.9,
    baro_altitude: 12000,
  }, // Denver area
  {
    icao24: "a5d7c3",
    callsign: "FFT888",
    origin_country: "United States",
    lat: 32.7,
    lon: -96.8,
    baro_altitude: 10500,
  }, // Dallas area

  // East Coast USA
  {
    icao24: "a3d4e5",
    callsign: "JBU321",
    origin_country: "United States",
    lat: 40.7,
    lon: -73.9,
    baro_altitude: 8500,
  }, // New York area
  {
    icao24: "abf123",
    callsign: "UAL444",
    origin_country: "United States",
    lat: 38.9,
    lon: -77.0,
    baro_altitude: 11000,
  }, // Washington D.C. area
  {
    icao24: "a7c8d9",
    callsign: "SWA999",
    origin_country: "United States",
    lat: 25.8,
    lon: -80.2,
    baro_altitude: 9800,
  }, // Miami area

  // Canada
  {
    icao24: "c0b3a1",
    callsign: "ACA111",
    origin_country: "Canada",
    lat: 43.7,
    lon: -79.4,
    baro_altitude: 10200,
  }, // Toronto area
  {
    icao24: "c0a7f2",
    callsign: "WJA222",
    origin_country: "Canada",
    lat: 49.2,
    lon: -123.1,
    baro_altitude: 9300,
  }, // Vancouver area

  // Mexico
  {
    icao24: "0d0f1e",
    callsign: "AMX333",
    origin_country: "Mexico",
    lat: 19.4,
    lon: -99.1,
    baro_altitude: 12500,
  }, // Mexico City area
];

// Keep the old MOCK_PLANES if needed elsewhere, or remove if MOCK_PLANES_NA replaces it entirely.
// export const MOCK_PLANES: Plane[] = MOCK_PLANES_NA; // Or assign directly
