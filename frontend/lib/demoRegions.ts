export type DemoRegion = {
  id: string;
  displayName: string;
  state: string;
  district: string;
  primaryCrop: string;
  farmId: string;
  latitude: number;
  longitude: number;
  description: string;
};

export const DEMO_REGIONS: DemoRegion[] = [
  {
    id: "ludhiana-punjab",
    displayName: "Ludhiana, Punjab",
    state: "Punjab",
    district: "Ludhiana",
    primaryCrop: "Wheat",
    farmId: "FARM-001",
    latitude: 30.9124,
    longitude: 75.8573,
    description: "Regional demo aligned with the actual Ludhiana farm record in the TerraScore dataset.",
  },
  {
    id: "latur-maharashtra",
    displayName: "Latur, Maharashtra",
    state: "Maharashtra",
    district: "Latur",
    primaryCrop: "Cotton",
    farmId: "FARM-002",
    latitude: 18.5569,
    longitude: 76.6002,
    description: "Regional demo aligned with the actual Latur farm record in the TerraScore dataset.",
  },
  {
    id: "jabalpur-madhya-pradesh",
    displayName: "Jabalpur, Madhya Pradesh",
    state: "Madhya Pradesh",
    district: "Jabalpur",
    primaryCrop: "Pulses",
    farmId: "FARM-012",
    latitude: 23.5287,
    longitude: 80.1891,
    description: "Regional demo aligned with the actual Jabalpur farm record in the TerraScore dataset.",
  },
  {
    id: "kota-rajasthan",
    displayName: "Kota, Rajasthan",
    state: "Rajasthan",
    district: "Kota",
    primaryCrop: "Mustard",
    farmId: "FARM-008",
    latitude: 25.1674,
    longitude: 75.8918,
    description: "Regional demo aligned with the actual Kota farm record in the TerraScore dataset.",
  },
  {
    id: "varanasi-uttar-pradesh",
    displayName: "Varanasi, Uttar Pradesh",
    state: "Uttar Pradesh",
    district: "Varanasi",
    primaryCrop: "Rice",
    farmId: "FARM-009",
    latitude: 25.1992,
    longitude: 83.0262,
    description: "Regional demo aligned with the actual Varanasi farm record in the TerraScore dataset.",
  },
];

export const DEFAULT_DEMO_REGION_ID = DEMO_REGIONS[0].id;

export function getDemoRegion(regionId?: string | null): DemoRegion {
  return DEMO_REGIONS.find((region) => region.id === regionId) ?? DEMO_REGIONS[0];
}
