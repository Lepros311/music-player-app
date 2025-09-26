import fs from 'fs';
import path from 'path';

// Cache the songs data
let songsCache = null;
let lastModified = null;

function loadSongs() {
  const songsPath = path.join(process.cwd(), 'public', 'songs.json');
  
  if (!fs.existsSync(songsPath)) {
    return [];
  }
  
  const stats = fs.statSync(songsPath);
  const currentModified = stats.mtime.getTime();
  
  if (!songsCache || lastModified !== currentModified) {
    try {
      const data = fs.readFileSync(songsPath, 'utf8');
      songsCache = JSON.parse(data);
      lastModified = currentModified;
      console.log(`Loaded ${songsCache.length} songs from cache`);
    } catch (error) {
      console.error('Error loading songs:', error);
      return [];
    }
  }
  
  return songsCache;
}

export async function GET({ request }) {
  try {
    // Parse URL manually from request
    const url = new URL(request.url);
    console.log('🎵 API called with URL:', url.href);
    console.log('🔍 Search params:', url.searchParams.toString());
    console.log('🔍 URL search:', url.search);
    console.log('🔍 URL searchParams entries:', Array.from(url.searchParams.entries()));
    
    const songs = loadSongs();
    
    // Get parameters from URL
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 50;
    const search = url.searchParams.get('search') || '';
    const artist = url.searchParams.get('artist') || '';
    const album = url.searchParams.get('album') || '';
    const year = url.searchParams.get('year') || '';
    const sortBy = url.searchParams.get('sortBy') || 'artist';
    const sortDir = url.searchParams.get('sortDir') || 'asc';
    
    console.log('🎵 Parsed params:', { page, limit, search, artist, album, year, sortBy, sortDir });
    
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
      console.log(`🔍 Applying album filter: "${album}"`);
      filteredSongs = filteredSongs.filter(song => 
        song.album.toLowerCase().includes(album.toLowerCase())
      );
      console.log(`🔍 After album filter: ${filteredSongs.length} songs`);
    }
    
    if (year) {
      console.log(`🔍 Applying year filter: "${year}"`);
      filteredSongs = filteredSongs.filter(song => 
        song.year.toString().includes(year)
      );
      console.log(`🔍 After year filter: ${filteredSongs.length} songs`);
    }
    
    // Apply sorting
    filteredSongs.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      
      if (sortBy === 'duration') {
        const timeToSeconds = time => {
          const [minutes, seconds] = time.split(':').map(Number);
          return minutes * 60 + seconds;
        };
        aVal = timeToSeconds(aVal);
        bVal = timeToSeconds(bVal);
      }
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
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
    
    // Get songs for current page
  const paginatedSongs = filteredSongs.slice(startIndex, endIndex).map((song, index) => ({
    ...song,
    id: startIndex + index + 1,
    cover: song.cover || '/default-cover.svg' // Ensure all songs have a cover
  }));
    
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
        'Cache-Control': 'no-cache, no-store, must-revalidate'
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
