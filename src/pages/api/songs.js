import Database from 'better-sqlite3';
import path from 'path';

let db = null;

function getDatabase() {
  if (!db) {
    const dbPath = path.join(process.cwd(), 'public', 'music.db');
    db = new Database(dbPath);
    console.log('Connected to SQLite database');
  }
  return db;
}

export async function GET({ request }) {
  try {
    console.log('🎵 API called - returning all songs from SQLite database');
    
    const database = getDatabase();
    
    // Get all songs from SQLite database
    const songs = database.prepare('SELECT * FROM songs ORDER BY artist, album, track, title').all();
    
    // Add default covers and IDs
    const allSongs = songs.map((song, index) => ({
      ...song,
      id: index + 1,
      cover: song.cover || '/default-cover.svg'
    }));
    
    console.log(`📊 Returning ${allSongs.length} songs from SQLite database`);
    
    return new Response(JSON.stringify({
      songs: allSongs,
      totalSongs: allSongs.length
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to load songs',
      songs: [],
      totalSongs: 0
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}