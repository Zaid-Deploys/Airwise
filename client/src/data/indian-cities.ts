/**
 * AIRWISE — Indian City Directory
 *
 * Canonical list of supported Indian cities with geographic coordinates.
 * Used by both the Onboarding wizard and the Preferences editor.
 */

export interface CityEntry {
  /** Display name */
  city: string;
  /** Latitude */
  lat: number;
  /** Longitude */
  lon: number;
  /** State or administrative region */
  state: string;
}

export const INDIAN_CITIES: readonly CityEntry[] = [
  { city: 'New Delhi', lat: 28.6139, lon: 77.2090, state: 'Delhi NCR' },
  { city: 'Noida', lat: 28.5355, lon: 77.3910, state: 'Uttar Pradesh' },
  { city: 'Gurugram', lat: 28.4595, lon: 77.0266, state: 'Haryana' },
  { city: 'Faridabad', lat: 28.4089, lon: 77.3178, state: 'Haryana' },
  { city: 'Mumbai', lat: 19.0760, lon: 72.8777, state: 'Maharashtra' },
  { city: 'Pune', lat: 18.5204, lon: 73.8567, state: 'Maharashtra' },
  { city: 'Kolkata', lat: 22.5726, lon: 88.3639, state: 'West Bengal' },
  { city: 'Bengaluru', lat: 12.9716, lon: 77.5946, state: 'Karnataka' },
  { city: 'Hyderabad', lat: 17.3850, lon: 78.4867, state: 'Telangana' },
  { city: 'Chennai', lat: 13.0827, lon: 80.2707, state: 'Tamil Nadu' },
  { city: 'Ahmedabad', lat: 23.0225, lon: 72.5714, state: 'Gujarat' },
  { city: 'Jaipur', lat: 26.9124, lon: 75.7873, state: 'Rajasthan' },
  { city: 'Lucknow', lat: 26.8467, lon: 80.9462, state: 'Uttar Pradesh' },
  { city: 'Kanpur', lat: 26.4499, lon: 80.3319, state: 'Uttar Pradesh' },
  { city: 'Varanasi', lat: 25.3176, lon: 82.9739, state: 'Uttar Pradesh' },
  { city: 'Patna', lat: 25.5941, lon: 85.1376, state: 'Bihar' },
  { city: 'Chandigarh', lat: 30.7333, lon: 76.7794, state: 'Punjab / Haryana' },
  { city: 'Indore', lat: 22.7196, lon: 75.8577, state: 'Madhya Pradesh' },
  { city: 'Bhopal', lat: 23.2599, lon: 77.4126, state: 'Madhya Pradesh' },
  { city: 'Nagpur', lat: 21.1458, lon: 79.0882, state: 'Maharashtra' },
] as const;
