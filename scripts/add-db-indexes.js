import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'public', 'music.db');

console.log('🔧 Adding database indexes for performance optimization...');
console.log('Database path:', DB_PATH);

let db;
try {
  db = new Database(DB_PATH);
  console.log('Successfully connected to SQLite database.');
} catch (error) {
  console.error('❌ Error connecting to database:', error.message);
  process.exit(1);
}

// Add indexes for commonly queried columns
const indexes = [
  {
    name: 'idx_artist',
    sql: 'CREATE INDEX IF NOT EXISTS idx_artist ON songs(artist)'
  },
  {
    name: 'idx_album', 
    sql: 'CREATE INDEX IF NOT EXISTS idx_album ON songs(album)'
  },
  {
    name: 'idx_title',
    sql: 'CREATE INDEX IF NOT EXISTS idx_title ON songs(title)'
  },
  {
    name: 'idx_year',
    sql: 'CREATE INDEX IF NOT EXISTS idx_year ON songs(year)'
  },
  {
    name: 'idx_artist_album_track',
    sql: 'CREATE INDEX IF NOT EXISTS idx_artist_album_track ON songs(artist, album, track)'
  },
  {
    name: 'idx_cover_binary',
    sql: 'CREATE INDEX IF NOT EXISTS idx_cover_binary ON songs(cover_binary) WHERE cover_binary IS NOT NULL'
  },
  {
    name: 'idx_id',
    sql: 'CREATE INDEX IF NOT EXISTS idx_id ON songs(id)'
  }
];

let created = 0;
let skipped = 0;

for (const index of indexes) {
  try {
    db.prepare(index.sql).run();
    console.log(`✅ Created index: ${index.name}`);
    created++;
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log(`⏭️ Index already exists: ${index.name}`);
      skipped++;
    } else {
      console.error(`❌ Error creating index ${index.name}:`, error.message);
    }
  }
}

console.log(`\n📊 Index creation complete:`);
console.log(`- Created: ${created} indexes`);
console.log(`- Skipped: ${skipped} indexes (already existed)`);

// Analyze the database to update query planner statistics
console.log('\n🔍 Analyzing database for query optimization...');
try {
  db.prepare('ANALYZE').run();
  console.log('✅ Database analysis complete');
} catch (error) {
  console.error('❌ Error analyzing database:', error.message);
}

db.close();
console.log('✅ Database optimization complete!');
