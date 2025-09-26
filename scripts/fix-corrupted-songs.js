import fs from 'fs';
import path from 'path';

const SONGS_FILE = 'public/songs.json';
const BACKUP_FILE = 'public/songs-backup.json';

console.log('Checking for corrupted songs.json...');

if (!fs.existsSync(SONGS_FILE)) {
  console.error('songs.json not found');
  process.exit(1);
}

if (!fs.existsSync(BACKUP_FILE)) {
  console.error('songs-backup.json not found');
  process.exit(1);
}

try {
  // Try to read the current songs.json
  const currentData = fs.readFileSync(SONGS_FILE, 'utf8');
  console.log('Current file size:', currentData.length);
  
  // Check if it's valid JSON
  try {
    JSON.parse(currentData);
    console.log('songs.json is valid JSON');
  } catch (e) {
    console.log('songs.json is corrupted, restoring from backup...');
    
    // Copy backup to main file
    fs.copyFileSync(BACKUP_FILE, SONGS_FILE);
    console.log('✅ Restored songs.json from backup');
    
    // Verify the restored file
    const restoredData = fs.readFileSync(SONGS_FILE, 'utf8');
    const songs = JSON.parse(restoredData);
    console.log(`✅ Verified: ${songs.length} songs restored`);
  }
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
