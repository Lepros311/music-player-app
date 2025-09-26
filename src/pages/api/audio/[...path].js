import fs from 'fs';
import path from 'path';

export async function GET({ params }) {
  try {
    // Reconstruct the file path from the URL parameters
    const pathArray = Array.isArray(params.path) ? params.path : [params.path];
    const filePath = pathArray.join('/');
    
    // Construct the full path by joining with the music directory
    const musicDir = 'C:/Users/Andrew/Music/Music';
    const fullPath = path.join(musicDir, filePath);
    
    console.log('🎵 Audio request:', { pathArray, filePath, fullPath, musicDir });
    
    // Security check - ensure the file is within the music directory
    const resolvedMusicDir = path.resolve(musicDir);
    const resolvedFullPath = path.resolve(fullPath);
    
    if (!resolvedFullPath.startsWith(resolvedMusicDir)) {
      console.log('❌ Access denied - path outside music directory:', { resolvedFullPath, resolvedMusicDir });
      return new Response('Access denied', { status: 403 });
    }
    
    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      return new Response('File not found', { status: 404 });
    }
    
    // Get file stats
    const stats = fs.statSync(fullPath);
    const fileSize = stats.size;
    const range = params.request?.headers?.get('range');
    
    // Read the file
    const fileBuffer = fs.readFileSync(fullPath);
    
    // Set appropriate headers
    const headers = {
      'Content-Type': 'audio/mpeg',
      'Accept-Ranges': 'bytes',
      'Content-Length': fileSize.toString(),
      'Cache-Control': 'public, max-age=3600'
    };
    
    // Handle range requests for audio streaming
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const chunk = fileBuffer.slice(start, end + 1);
      
      headers['Content-Range'] = `bytes ${start}-${end}/${fileSize}`;
      headers['Content-Length'] = chunksize.toString();
      
      return new Response(chunk, {
        status: 206,
        headers
      });
    }
    
    return new Response(fileBuffer, {
      status: 200,
      headers
    });
    
  } catch (error) {
    console.error('Error serving audio file:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
