// data/zones.js – static zone definitions (will later come from JSON)
export const zones = [
  {
    id: "beach",
    name: "Sunny Beach",
    description: "Remove seaweed and plant palms",
    unlockRequirement: null,          // first zone, always available
    bgColor: "#ffe0b2",               // placeholder color
  },
  {
    id: "forest",
    name: "Misty Forest",
    description: "Clear vines, plant indigenous trees",
    unlockRequirement: { zone: "beach", health: 70 },  // example: 70% on beach unlocks
    bgColor: "#c8e6c9",
  },
  {
    id: "mountain",
    name: "Rocky Mountain",
    description: "Remove alien weeds, restore grass",
    unlockRequirement: { zone: "forest", health: 60 },
    bgColor: "#cfd8dc",
  },
  // Add more later...
];