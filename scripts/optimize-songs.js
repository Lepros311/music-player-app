import fs from 'fs';
import path from 'path';

const INPUT_FILE = 'public/songs.json';
const OUTPUT_FILE = 'public/songs.json';
const BACKUP_FILE = 'public/songs-backup.json';

console.log('🔧 Optimizing songs.json for web performance...');

try {
  // Backup the original file
  console.log('💾 Creating backup...');
  fs.copyFileSync(INPUT_FILE, BACKUP_FILE);
  
  // Get file size
  const stats = fs.statSync(INPUT_FILE);
  const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);
  console.log(`📁 Original file size: ${fileSizeMB} MB`);
  
  // Read and parse the JSON
  console.log('📖 Reading songs...');
  const songs = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
  console.log(`✅ Loaded ${songs.length} songs`);
  
  // Optimize the data structure - remove unnecessary fields
  console.log('⚡ Optimizing data structure...');
  const optimizedSongs = songs.map(song => ({
    id: song.id,
    title: song.title,
    artist: song.artist,
    album: song.album,
    duration: song.duration,
    year: song.year,
    cover: song.cover,
    path: song.path
    // Remove: originalPath, processingTime, hasEmbeddedCover
  }));
  
  // Write optimized version
  console.log('💾 Writing optimized songs.json...');
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(optimizedSongs, null, 0)); // No pretty printing to save space
  
  // Check new file size
  const newStats = fs.statSync(OUTPUT_FILE);
  const newFileSizeMB = (newStats.size / 1024 / 1024).toFixed(2);
  const reduction = ((stats.size - newStats.size) / stats.size * 100).toFixed(1);
  
  console.log(`✅ Optimization complete!`);
  console.log(`📁 New file size: ${newFileSizeMB} MB (${reduction}% reduction)`);
  console.log(`🎵 Songs: ${optimizedSongs.length}`);
  console.log(`💾 Backup saved to: ${BACKUP_FILE}`);
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
