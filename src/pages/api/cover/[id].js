import Database from 'better-sqlite3';
import path from 'path';

let db = null;

function getDatabase() {
  if (!db) {
    // Try multiple possible paths for the database
    const possiblePaths = [
      path.join(process.cwd(), 'public', 'music.db'),
      path.join(process.cwd(), '..', 'public', 'music.db'),
      path.join(import.meta.url, '..', '..', '..', '..', 'public', 'music.db').replace('file://', ''),
      './public/music.db',
      '../public/music.db'
    ];
    
    let dbPath = null;
    let lastError = null;
    
    for (const testPath of possiblePaths) {
      try {
        console.log('Trying database path:', testPath);
        db = new Database(testPath);
        dbPath = testPath;
        console.log('Successfully connected to SQLite database at:', dbPath);
        break;
      } catch (error) {
        console.log('Failed to connect to:', testPath, '-', error.message);
        lastError = error;
        db = null;
      }
    }
    
    if (!db) {
      console.error('Failed to connect to database at any of the attempted paths:', possiblePaths);
      console.error('Last error:', lastError);
      throw new Error(`Database not found. Tried paths: ${possiblePaths.join(', ')}`);
    }
  }
  return db;
}

export async function GET({ params }) {
  try {
    const songId = params.id;
    console.log(`🖼️ Cover API called for song ID: ${songId}`);
    
    const database = getDatabase();
    
    // Get the binary cover data for the specific song
    const song = database.prepare('SELECT cover_binary FROM songs WHERE id = ?').get(parseInt(songId));
    
    console.log(`Database query result for ID ${songId}:`, {
      found: !!song,
      hasBinaryCover: song ? !!song.cover_binary : false,
      coverSize: song ? (song.cover_binary ? song.cover_binary.length : 0) : 0
    });
    
    if (!song || !song.cover_binary) {
      console.log(`Song with ID ${songId} not found or no binary cover data`);
      // Return a 404 with a default image
      return new Response('', {
        status: 404,
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=3600'
        }
      });
    }
    
    console.log(`Found binary cover for song ID ${songId}, size: ${song.cover_binary.length} bytes`);
    
    // Return the binary data directly
    return new Response(song.cover_binary, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000' // Cache for a year
      }
    });

  } catch (error) {
    console.error('Cover API Error:', error);
    return new Response('', {
      status: 500,
      headers: {
        'Content-Type': 'image/svg+xml'
      }
    });
  }
}
