import fs from 'fs';
import path from 'path';
import { parseFile } from 'music-metadata';
import Database from 'better-sqlite3';

// Configuration
const MUSIC_FOLDER = 'C:\\Users\\Andrew\\Music\\Music';
const DB_FILE = 'public/music.db';
const SUPPORTED_EXTENSIONS = ['.mp3', '.m4a', '.flac', '.wav', '.aac', '.ogg', '.wma'];

// Progress tracking
let processedFiles = 0;
let totalFiles = 0;
let failedFiles = [];
let skippedFiles = [];

// Initialize SQLite database
function initDatabase() {
  const db = new Database(DB_FILE);
  
  // Create songs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS songs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      artist TEXT NOT NULL,
      album TEXT NOT NULL,
      year INTEGER,
      duration TEXT,
      track INTEGER,
      path TEXT UNIQUE NOT NULL,
      cover TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create indexes for faster searching
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_artist ON songs(artist);
    CREATE INDEX IF NOT EXISTS idx_album ON songs(album);
    CREATE INDEX IF NOT EXISTS idx_year ON songs(year);
    CREATE INDEX IF NOT EXISTS idx_title ON songs(title);
  `);
  
  return db;
}

// Get all audio files recursively
function getAllAudioFiles(dir) {
  const files = [];
  
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      
      if (item.isDirectory()) {
        // Skip hidden/system folders
        if (!item.name.startsWith('.')) {
          files.push(...getAllAudioFiles(fullPath));
        }
      } else if (item.isFile()) {
        const ext = path.extname(item.name).toLowerCase();
        if (SUPPORTED_EXTENSIONS.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not read directory ${dir}:`, error.message);
  }
  
  return files;
}

// Extract metadata from a single file
async function extractMetadata(filePath) {
  const startTime = Date.now();
  
  try {
    const metadata = await parseFile(filePath);
    const duration = metadata.format.duration;
    const durationStr = duration ? 
      `${Math.floor(duration / 60)}:${Math.floor(duration % 60).toString().padStart(2, '0')}` : 
      '0:00';
    
    return {
      title: metadata.common.title || path.basename(filePath, path.extname(filePath)),
      artist: metadata.common.artist || 'Unknown Artist',
      album: metadata.common.album || 'Unknown Album',
      year: metadata.common.year || null,
      duration: durationStr,
      track: metadata.common.track?.no || null,
      path: filePath.replace(/\\/g, '/'), // Normalize path separators
      cover: null // We'll skip cover images for now to keep DB size manageable
    };
  } catch (error) {
    console.warn(`Error parsing ${filePath}:`, error.message);
    return null;
  }
}

// Process files in batches
async function processBatch(db, files, startTime, batchSize = 50) {
  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO songs (title, artist, album, year, duration, track, path, cover)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const insertMany = db.transaction((songs) => {
    for (const song of songs) {
      if (song) {
        insertStmt.run(
          song.title,
          song.artist,
          song.album,
          song.year,
          song.duration,
          song.track,
          song.path,
          song.cover
        );
      }
    }
  });
  
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    const batchStartTime = Date.now();
    
    console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(files.length / batchSize)} (${batch.length} files)`);
    
    const songs = [];
    for (const file of batch) {
      try {
        const metadata = await extractMetadata(file);
        if (metadata) {
          songs.push(metadata);
          processedFiles++;
        } else {
          failedFiles.push(file);
        }
      } catch (error) {
        console.warn(`Error processing ${file}:`, error.message);
        failedFiles.push(file);
      }
    }
    
    // Insert batch into database
    insertMany(songs);
    
    const batchTime = Date.now() - batchStartTime;
    const progress = ((i + batch.length) / files.length * 100).toFixed(1);
    const elapsed = (Date.now() - startTime) / 1000;
    const estimatedTotal = (elapsed / (i + batch.length)) * files.length;
    const remaining = estimatedTotal - elapsed;
    
    console.log(`📈 Progress: ${i + batch.length}/${files.length} (${progress}%) - Batch: ${songs.length}/${batch.length} successful`);
    console.log(`⏱️  Elapsed: ${elapsed.toFixed(1)}s, Estimated total: ${estimatedTotal.toFixed(1)}s, Remaining: ${remaining.toFixed(1)}s`);
  }
}

// Main function
async function main() {
  console.log('🚀 Starting SQLite music library scan...');
  
  const startTime = Date.now();
  
  // Initialize database
  console.log('📊 Initializing database...');
  const db = initDatabase();
  
  // Clear existing data
  console.log('🗑️  Clearing existing data...');
  db.exec('DELETE FROM songs');
  
  // Get all audio files
  console.log('🔍 Scanning for audio files...');
  const files = getAllAudioFiles(MUSIC_FOLDER);
  totalFiles = files.length;
  
  console.log(`📁 Found ${totalFiles} audio files`);
  
  if (totalFiles === 0) {
    console.log('❌ No audio files found!');
    return;
  }
  
  // Process files
  console.log('🎵 Processing files...');
  await processBatch(db, files, startTime);
  
  // Final statistics
  const totalTime = (Date.now() - startTime) / 1000;
  const successRate = ((processedFiles / totalFiles) * 100).toFixed(1);
  
  console.log('\n✅ Scan completed!');
  console.log(`📊 Processed: ${processedFiles}/${totalFiles} files (${successRate}%)`);
  console.log(`⏱️  Total time: ${totalTime.toFixed(1)}s`);
  console.log(`❌ Failed: ${failedFiles.length} files`);
  console.log(`💾 Database saved to: ${DB_FILE}`);
  
  // Show some sample data
  const sampleSongs = db.prepare('SELECT title, artist, album FROM songs LIMIT 5').all();
  console.log('\n🎵 Sample songs:');
  sampleSongs.forEach(song => {
    console.log(`  - ${song.title} by ${song.artist} (${song.album})`);
  });
  
  db.close();
}

// Run the scan
main().catch(console.error);
