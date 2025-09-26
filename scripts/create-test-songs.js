import fs from 'fs';

const OUTPUT_FILE = 'public/songs.json';

console.log('🔧 Creating test songs.json...');

// Create a smaller test dataset
const testSongs = [
  {
    id: 1,
    title: "Breaking over Branches",
    artist: "Fog Lake",
    album: "Dragonchaser",
    duration: "3:45",
    year: 2017,
    cover: "https://via.placeholder.com/40?text=?",
    path: "/music/Fog Lake/Dragonchaser/Breaking over Branches.mp3"
  },
  {
    id: 2,
    title: "Kerosene",
    artist: "Fog Lake",
    album: "Dragonchaser",
    duration: "4:12",
    year: 2017,
    cover: "https://via.placeholder.com/40?text=?",
    path: "/music/Fog Lake/Dragonchaser/Kerosene.mp3"
  },
  {
    id: 3,
    title: "Dragonchaser",
    artist: "Fog Lake",
    album: "Dragonchaser",
    duration: "3:28",
    year: 2017,
    cover: "https://via.placeholder.com/40?text=?",
    path: "/music/Fog Lake/Dragonchaser/Dragonchaser.mp3"
  }
];

try {
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(testSongs, null, 2));
  console.log(`✅ Created test songs.json with ${testSongs.length} songs`);
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
