import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_FILE = path.join(__dirname, '..', 'public', 'songs.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'public', 'songs-optimized.json');

console.log('🚀 Starting songs optimization...');

try {
  // Read the large songs.json file
  console.log('📖 Reading songs.json...');
  const data = fs.readFileSync(INPUT_FILE, 'utf8');
  const songs = JSON.parse(data);
  
  console.log(`📊 Found ${songs.length} songs`);
  
  // Optimize each song by removing base64 cover data
  const optimizedSongs = songs.map(song => ({
    ...song,
    cover: song.cover ? '/default-cover.png' : null // Replace base64 with placeholder
  }));
  
  // Write optimized version
  console.log('💾 Writing optimized songs...');
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(optimizedSongs, null, 2));
  
  // Check file sizes
  const originalSize = fs.statSync(INPUT_FILE).size;
  const optimizedSize = fs.statSync(OUTPUT_FILE).size;
  
  console.log(`✅ Optimization complete!`);
  console.log(`📁 Original size: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`📁 Optimized size: ${(optimizedSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`📉 Size reduction: ${((originalSize - optimizedSize) / originalSize * 100).toFixed(1)}%`);
  
} catch (error) {
  console.error('❌ Error optimizing songs:', error);
}