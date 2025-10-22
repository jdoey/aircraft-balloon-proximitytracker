export interface Balloon {
  id: string;
  lat: number;
  lon: number;
  alt: number | null;
}

export interface Plane {
  icao24: string;
  callsign: string;
  origin_country: string;
  lon: number;
  lat: number;
  baro_altitude: number | null;
}
