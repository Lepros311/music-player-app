import Database from 'better-sqlite3';
import path from 'path';

let db = null;

function getDatabase() {
  if (!db) {
    // Try multiple possible paths for the database
    const possiblePaths = [
      path.join(process.cwd(), 'public', 'music.db'),
      path.join(process.cwd(), '..', 'public', 'music.db'),
      path.join(import.meta.url, '..', '..', '..', 'public', 'music.db').replace('file://', ''),
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

export async function GET({ request }) {
  try {
    console.log('🎵 API called - returning all songs from SQLite database');
    console.log('Current working directory:', process.cwd());
    console.log('Import meta URL:', import.meta.url);
    
    const database = getDatabase();
    
    // Test database connection with a simple query
    console.log('Testing database connection...');
    const testResult = database.prepare('SELECT COUNT(*) as count FROM songs').get();
    console.log('Database test query result:', testResult);
    
    // Get all songs from SQLite database
    console.log('Fetching songs from database...');
    const songs = database.prepare('SELECT * FROM songs ORDER BY artist, album, track, title').all();
    console.log(`Found ${songs.length} songs in database`);
    
    // Add covers - use API endpoints for all covers
    let coversWithApi = 0;
    let coversExcluded = 0;
    
    const allSongs = songs.map((song, index) => {
      let cover = '/default-cover.svg';
      
      // If song has a cover, use API endpoint
      if (song.cover && song.cover.startsWith('data:')) {
        cover = `/api/cover/${song.id}`;
        coversWithApi++;
      } else {
        coversExcluded++;
      }
      
      // Return song data without the original cover field to avoid large base64 data
      const { cover: originalCover, cover_binary, ...songData } = song;
      
      return {
        ...songData,
        cover: cover
      };
    });
    
    console.log(`Cover stats: ${coversWithApi} covers using API, ${coversExcluded} covers excluded`);
    
    console.log(`📊 Returning ${allSongs.length} songs from SQLite database`);
    
    try {
      const responseData = {
        songs: allSongs,
        totalSongs: allSongs.length
      };
      
      const jsonString = JSON.stringify(responseData);
      console.log(`JSON response size: ${jsonString.length} characters`);
      
      return new Response(jsonString, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
    } catch (jsonError) {
      console.error('JSON serialization error:', jsonError);
      throw new Error(`JSON serialization failed: ${jsonError.message}`);
    }

  } catch (error) {
    console.error('API Error:', error);
    console.error('Error stack:', error.stack);
    return new Response(JSON.stringify({
      error: 'Failed to load songs',
      errorDetails: error.message,
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