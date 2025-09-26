import fs from 'fs';
import path from 'path';

const TEMP_FILE = 'public/songs.tmp.json';
const OUTPUT_FILE = 'public/songs.json';

console.log('🔧 Fixing large JSON file...');

try {
  // Check if temp file exists
  if (!fs.existsSync(TEMP_FILE)) {
    console.error('❌ Temp file not found:', TEMP_FILE);
    process.exit(1);
  }

  // Get file size
  const stats = fs.statSync(TEMP_FILE);
  const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);
  console.log(`📁 Temp file size: ${fileSizeMB} MB`);

  // Read the temp file in chunks to avoid memory issues
  console.log('📖 Reading temp file...');
  const tempData = fs.readFileSync(TEMP_FILE, 'utf8');
  
  // Parse JSON to validate it
  console.log('🔍 Validating JSON...');
  const songs = JSON.parse(tempData);
  console.log(`✅ Valid JSON with ${songs.length} songs`);

  // Write to final file
  console.log('💾 Writing to songs.json...');
  fs.writeFileSync(OUTPUT_FILE, tempData);
  
  // Verify the final file
  const finalStats = fs.statSync(OUTPUT_FILE);
  const finalSizeMB = (finalStats.size / 1024 / 1024).toFixed(2);
  console.log(`✅ Successfully created songs.json (${finalSizeMB} MB)`);
  
  // Clean up temp file
  fs.unlinkSync(TEMP_FILE);
  console.log('🗑️ Cleaned up temp file');
  
  console.log('🎉 Large JSON file fixed successfully!');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
