// data/zones.js
export const zones = [
  {
    id: "beach",
    name: "Sunny Beach",
    description: "Remove seaweed and plant palms",
    unlockRequirement: null,
    bgColor: "#ffe0b2"
  },
  {
    id: "forest",
    name: "Misty Forest",
    description: "Clear vines, plant indigenous trees",
    unlockRequirement: { zone: "beach", health: 70 },
    bgColor: "#c8e6c9"
  },
  {
    id: "mountain",
    name: "Rocky Mountain",
    description: "Remove alien weeds, restore grass",
    unlockRequirement: { zone: "forest", health: 60 },
    bgColor: "#cfd8dc"
  }
];