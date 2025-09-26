import fs from 'fs';
import path from 'path';

// Cache the songs data to avoid reading the file repeatedly
let songsCache = null;
let lastModified = null;

// Force cache clear on startup
songsCache = null;
lastModified = null;

function loadSongs() {
  const songsPath = path.join(process.cwd(), 'public', 'songs-test.json');
  
  // Check if file exists and get modification time
  if (!fs.existsSync(songsPath)) {
    return [];
  }
  
  const stats = fs.statSync(songsPath);
  const currentModified = stats.mtime.getTime();
  
  // Reload if file has been modified or cache is empty
  if (!songsCache || lastModified !== currentModified) {
    try {
      const data = fs.readFileSync(songsPath, 'utf8');
      songsCache = JSON.parse(data);
      lastModified = currentModified;
      console.log(`Loaded ${songsCache.length} songs from cache`);
      console.log(`First song:`, songsCache[0]?.title || 'No songs');
      console.log(`Sample cover:`, songsCache[0]?.cover || 'No cover');
    } catch (error) {
      console.error('Error loading songs:', error);
      return [];
    }
  }
  
  return songsCache;
}

export async function GET({ request }) {
  try {
    const songs = loadSongs();
    
    // Parse URL manually from request
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 50;
    const search = url.searchParams.get('search') || '';
    const artist = url.searchParams.get('artist') || '';
    const album = url.searchParams.get('album') || '';
    const year = url.searchParams.get('year') || '';
    const sortBy = url.searchParams.get('sortBy') || 'artist';
    const sortDir = url.searchParams.get('sortDir') || 'asc';
    
    const requestId = url.searchParams.get('requestId') || 'unknown';
    console.log('🎵 API called with params:', { page, limit, search, artist, album, year, sortBy, sortDir, requestId });
    console.log('🔍 Raw URL:', request.url);
    console.log('🔍 Individual params:', {
      search: url.searchParams.get('search'),
      artist: url.searchParams.get('artist'),
      album: url.searchParams.get('album'),
      year: url.searchParams.get('year')
    });
    
    // Apply filters
    let filteredSongs = [...songs];
    console.log(`🔍 Before filtering: ${filteredSongs.length} songs`);
    
    if (search) {
      console.log(`🔍 Applying search filter: "${search}"`);
      const searchLower = search.toLowerCase();
      filteredSongs = filteredSongs.filter(song => 
        song.title.toLowerCase().includes(searchLower) ||
        song.artist.toLowerCase().includes(searchLower) ||
        song.album.toLowerCase().includes(searchLower)
      );
      console.log(`🔍 After search filter: ${filteredSongs.length} songs`);
    }
    
    if (artist) {
      console.log(`🔍 Applying artist filter: "${artist}"`);
      filteredSongs = filteredSongs.filter(song => 
        song.artist.toLowerCase().includes(artist.toLowerCase())
      );
      console.log(`🔍 After artist filter: ${filteredSongs.length} songs`);
    }
    
    if (album) {
      filteredSongs = filteredSongs.filter(song => 
        song.album.toLowerCase().includes(album.toLowerCase())
      );
    }
    
    if (year) {
      filteredSongs = filteredSongs.filter(song => 
        song.year.toString().includes(year)
      );
    }
    
    // Apply sorting
    filteredSongs.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      
      // Handle duration sorting (convert to seconds)
      if (sortBy === 'duration') {
        const timeToSeconds = time => {
          const [minutes, seconds] = time.split(':').map(Number);
          return minutes * 60 + seconds;
        };
        aVal = timeToSeconds(aVal);
        bVal = timeToSeconds(bVal);
      }
      
      // Handle string comparison
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      // For artist sorting, group by album and maintain track order
      if (sortBy === 'artist') {
        // First sort by artist
        if (aVal !== bVal) {
          return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        // Then by album
        const albumA = a.album.toLowerCase();
        const albumB = b.album.toLowerCase();
        if (albumA !== albumB) {
          return sortDir === 'asc' ? albumA.localeCompare(albumB) : albumB.localeCompare(albumA);
        }
        // Then by track number if available, otherwise by title
        const trackA = a.track || 0;
        const trackB = b.track || 0;
        if (trackA !== trackB) {
          return sortDir === 'asc' ? trackA - trackB : trackB - trackA;
        }
        return sortDir === 'asc' ? a.title.toLowerCase().localeCompare(b.title.toLowerCase()) : b.title.toLowerCase().localeCompare(a.title.toLowerCase());
      }
      
      // Default sorting
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      return 0;
    });
    
    // Calculate pagination
    const totalSongs = filteredSongs.length;
    const totalPages = Math.ceil(totalSongs / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    console.log(`📊 Filtered results: ${totalSongs} songs (showing ${startIndex + 1}-${Math.min(endIndex, totalSongs)})`);
    
    // Get songs for current page and ensure unique IDs
    const paginatedSongs = filteredSongs.slice(startIndex, endIndex).map((song, index) => ({
      ...song,
      id: startIndex + index + 1 // Ensure unique IDs for pagination
    }));
    
    // Return response
    return new Response(JSON.stringify({
      songs: paginatedSongs,
      pagination: {
        currentPage: page,
        totalPages,
        totalSongs,
        limit,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate' // Disable caching
      }
    });
    
  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to load songs',
      songs: [],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalSongs: 0,
        limit: 50,
        hasNext: false,
        hasPrev: false
      }
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}
