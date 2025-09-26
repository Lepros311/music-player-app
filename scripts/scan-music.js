import fs from 'fs';
import path from 'path';
import { parseFile } from 'music-metadata';

// Configuration
const MUSIC_FOLDER = 'C:\\Users\\Andrew\\Music\\Music';
const OUTPUT_FILE = 'public/songs.json';
const TEMP_FILE = 'public/songs.tmp.json';
const SUPPORTED_EXTENSIONS = ['.mp3', '.m4a', '.flac', '.wav', '.aac', '.ogg', '.wma'];

// Progress tracking
let processedFiles = 0;
let totalFiles = 0;
let songs = [];
let failedFiles = [];
let skippedFiles = [];
let logFile = 'public/scan-log.json';

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
    const { common, format } = metadata;
    
    // Calculate duration in MM:SS format
    const duration = format.duration ? 
      Math.floor(format.duration / 60) + ':' + 
      Math.floor(format.duration % 60).toString().padStart(2, '0') : 
      '0:00';
    
    // Generate a web-accessible path (relative to public folder)
    // Since we'll create a symlink, we need to map to the music folder
    const relativePath = path.relative(MUSIC_FOLDER, filePath);
    const webPath = '/music/' + relativePath.replace(/\\/g, '/');
    
    // Extract cover art if available
    let coverUrl = 'https://via.placeholder.com/40?text=?';
    if (common.picture && common.picture.length > 0) {
      const cover = common.picture[0];
      const base64 = cover.data.toString('base64');
      coverUrl = `data:${cover.format};base64,${base64}`;
    }
    
    const processingTime = Date.now() - startTime;
    const songData = {
      id: songs.length + 1,
      title: common.title || path.basename(filePath, path.extname(filePath)),
      artist: common.artist || 'Unknown Artist',
      album: common.album || 'Unknown Album',
      duration: duration,
      year: common.year || new Date().getFullYear(),
      cover: coverUrl,
      path: webPath,
      originalPath: filePath,
      processingTime: processingTime,
      hasEmbeddedCover: !!(common.picture && common.picture.length > 0)
    };
    
    console.log(`✅ Processed: ${songData.title} by ${songData.artist} (${processingTime}ms)`);
    return songData;
  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorInfo = {
      file: filePath,
      error: error.message,
      timestamp: new Date().toISOString(),
      processingTime: processingTime
    };
    
    failedFiles.push(errorInfo);
    console.warn(`❌ Failed: ${filePath} - ${error.message} (${processingTime}ms)`);
    return null;
  }
}

// Save detailed log information
async function saveLog() {
  const logData = {
    scanStart: new Date().toISOString(),
    musicFolder: MUSIC_FOLDER,
    totalFilesFound: totalFiles,
    processedFiles: processedFiles,
    successfulSongs: songs.length,
    failedFiles: failedFiles,
    skippedFiles: skippedFiles,
    lastUpdate: new Date().toISOString()
  };
  
  try {
    await fs.promises.writeFile(logFile, JSON.stringify(logData, null, 2));
    console.log(`📝 Log saved to ${logFile}`);
  } catch (error) {
    console.error('❌ Failed to save log:', error.message);
  }
}

// Main scanning function
async function scanMusicLibrary() {
  const scanStartTime = Date.now();
  console.log('🎵 Starting music library scan...');
  console.log(`📁 Scanning: ${MUSIC_FOLDER}`);
  console.log(`📝 Log file: ${logFile}`);
  
  // Initialize log
  await saveLog();
  
  // Check if music folder exists
  if (!fs.existsSync(MUSIC_FOLDER)) {
    console.error(`❌ Music folder not found: ${MUSIC_FOLDER}`);
    process.exit(1);
  }
  
  // Get all audio files
  console.log('🔍 Finding audio files...');
  const audioFiles = getAllAudioFiles(MUSIC_FOLDER);
  totalFiles = audioFiles.length;
  
  if (totalFiles === 0) {
    console.log('❌ No audio files found in the specified directory');
    process.exit(1);
  }
  
  console.log(`📊 Found ${totalFiles} audio files`);
  console.log('⏳ Processing files...\n');
  
  // Process files in batches to avoid memory issues
  const BATCH_SIZE = 10;
  for (let i = 0; i < audioFiles.length; i += BATCH_SIZE) {
    const batch = audioFiles.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(audioFiles.length / BATCH_SIZE);
    
    console.log(`\n🔄 Processing batch ${batchNumber}/${totalBatches} (${batch.length} files)`);
    
    const promises = batch.map(file => extractMetadata(file));
    
    try {
      const results = await Promise.all(promises);
      const validSongs = results.filter(song => song !== null);
      songs.push(...validSongs);
      
      processedFiles += batch.length;
      const progress = Math.round((processedFiles / totalFiles) * 100);
      const elapsed = ((Date.now() - scanStartTime) / 1000).toFixed(1);
      const estimatedTotal = (elapsed / (processedFiles / totalFiles)).toFixed(1);
      const remaining = (estimatedTotal - elapsed).toFixed(1);
      
      console.log(`📈 Progress: ${processedFiles}/${totalFiles} (${progress}%) - Batch: ${validSongs.length}/${batch.length} successful`);
      console.log(`⏱️  Elapsed: ${elapsed}s, Estimated total: ${estimatedTotal}s, Remaining: ${remaining}s`);
      
      // Save incremental progress every 1000 songs
      if (songs.length % 1000 === 0) {
        try {
          fs.writeFileSync(TEMP_FILE, JSON.stringify(songs, null, 2));
          console.log(`💾 Saved progress: ${songs.length} songs to ${TEMP_FILE}`);
        } catch (error) {
          console.warn('⚠️ Could not save progress:', error.message);
        }
      }
      
      // Save log every 100 files for more frequent updates
      if (processedFiles % 100 === 0) {
        await saveLog();
      }
    } catch (error) {
      console.error('❌ Error processing batch:', error.message);
    }
  }
  
  // Save to songs.json
  console.log('\n💾 Saving results...');
  try {
    // Write to temp file first
    fs.writeFileSync(TEMP_FILE, JSON.stringify(songs, null, 2));
    
    // Atomically rename temp file to final file
    if (fs.existsSync(OUTPUT_FILE)) {
      fs.unlinkSync(OUTPUT_FILE);
    }
    fs.renameSync(TEMP_FILE, OUTPUT_FILE);
    
    console.log(`✅ Successfully saved ${songs.length} songs to ${OUTPUT_FILE}`);
    console.log(`📁 Total size: ${(fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(2)} MB`);
  } catch (error) {
    console.error('❌ Error saving songs.json:', error.message);
    // If final save fails, at least we have the temp file
    if (fs.existsSync(TEMP_FILE)) {
      console.log(`💾 Partial results saved to ${TEMP_FILE}`);
    }
    process.exit(1);
  }
  
  const totalTime = ((Date.now() - scanStartTime) / 1000).toFixed(1);
  console.log('\n✅ Scan complete!');
  console.log(`📊 Total songs processed: ${songs.length}`);
  console.log(`⏱️  Total time: ${totalTime} seconds`);
  console.log(`📈 Average: ${(totalTime / songs.length).toFixed(2)} seconds per song`);
  console.log(`❌ Failed files: ${failedFiles.length}`);
  console.log(`⏭️  Skipped files: ${skippedFiles.length}`);
  
  // Save final log
  await saveLog();
  
  // Print summary of failed files
  if (failedFiles.length > 0) {
    console.log('\n❌ Failed files summary:');
    failedFiles.slice(0, 10).forEach(fail => {
      console.log(`  - ${fail.file}: ${fail.error}`);
    });
    if (failedFiles.length > 10) {
      console.log(`  ... and ${failedFiles.length - 10} more (see ${logFile} for details)`);
    }
  }
  
  console.log(`\n📝 Detailed log saved to: ${logFile}`);
  console.log('🎉 Music library scan completed successfully!');
  console.log('🔄 Refresh your browser to see the updated library');
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

// Run the scanner
scanMusicLibrary().catch(console.error);
