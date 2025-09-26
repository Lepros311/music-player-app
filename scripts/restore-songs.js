import fs from 'fs';

const BACKUP_FILE = 'public/songs-backup.json';
const OUTPUT_FILE = 'public/songs.json';

console.log('🔄 Restoring full songs library...');

try {
  // Check if backup exists
  if (!fs.existsSync(BACKUP_FILE)) {
    console.error('❌ Backup file not found:', BACKUP_FILE);
    process.exit(1);
  }

  // Get backup file size
  const stats = fs.statSync(BACKUP_FILE);
  const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);
  console.log(`📁 Backup file size: ${fileSizeMB} MB`);

  // Copy backup to songs.json
  console.log('📋 Copying backup to songs.json...');
  fs.copyFileSync(BACKUP_FILE, OUTPUT_FILE);
  
  // Verify the copy
  const newStats = fs.statSync(OUTPUT_FILE);
  const newSizeMB = (newStats.size / 1024 / 1024).toFixed(2);
  console.log(`✅ Restored songs.json (${newSizeMB} MB)`);
  
  // Parse to get song count
  const songs = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
  console.log(`🎵 Total songs: ${songs.length}`);
  
  console.log('🎉 Library restored successfully!');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
