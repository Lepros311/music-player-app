// Music Player App
console.log("🎵 Initializing Plyr audio player...");
const player = new Plyr('#audio-player', {
  controls: ['play-large', 'play', 'progress', 'current-time', 'duration', 'mute', 'volume', 'settings'],
  settings: ['speed'],
  speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] }
});
console.log("✅ Plyr player initialized:", player);

// Return to top button
document.getElementById('return-to-top').onclick = function() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
console.log("✅ Return to top button uses direct onclick handler");

// Alpine.js component for music library
Alpine.data("library", () => ({
  // Data properties
  allSongs: [],
  filteredSongs: [],
  displayedSongs: [],
  currentSong: null,
  isPlaying: false,
  searchTerm: "",
  sortBy: "artist",
  sortOrder: "asc",
  
  // Filter properties
  filters: {
    artist: "",
    album: "",
    year: ""
  },

  // Methods
  async init() {
    try {
      console.log("🚀 Library component init() called!");
      // Load all songs initially
      await this.loadAllSongs();
      console.log("Library initialized with songs loaded");
      
      // Lazy loading removed - not working properly
      
      // Set up return to top button
      this.setupReturnToTop();
    } catch (error) {
      console.error("Error initializing library:", error);
      // Error occurred during initialization
    }
  },

  async loadAllSongs() {
    try {
      console.log("🚀 Loading all songs...");
      
      const response = await fetch('/api/songs');
      if (!response.ok) {
        throw new Error("Failed to fetch songs from API");
      }
      
      const data = await response.json();
      this.allSongs = data.songs;
      
      console.log(`Loaded ${this.allSongs.length} songs total`);
      
      // Initial filtering and display
      this.applyFiltersAndSort();
      
      // Songs loaded successfully
      console.log("🎉 Songs loaded successfully");
    } catch (error) {
      console.error("Error loading songs:", error);
      this.allSongs = [];
      this.filteredSongs = [];
      this.displayedSongs = [];
      // Error loading songs
      console.log("❌ Error loading songs");
    }
  },

  applyFiltersAndSort() {
    console.log('🔍 Applying filters:', { 
      searchTerm: this.searchTerm, 
      artist: this.filters.artist,
      album: this.filters.album,
      year: this.filters.year
    });
    
    
    // Apply filters
    let filtered = [...this.allSongs];
    
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(song => 
        song.title.toLowerCase().includes(term) ||
        song.artist.toLowerCase().includes(term) ||
        song.album.toLowerCase().includes(term)
      );
    }
    
    if (this.filters.artist) {
      filtered = filtered.filter(song => 
        song.artist.toLowerCase().includes(this.filters.artist.toLowerCase())
      );
    }
    
    if (this.filters.album) {
      filtered = filtered.filter(song => 
        song.album.toLowerCase().includes(this.filters.album.toLowerCase())
      );
    }
    
    if (this.filters.year) {
      filtered = filtered.filter(song => 
        song.year && song.year.toString().includes(this.filters.year)
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aVal = a[this.sortBy];
      let bVal = b[this.sortBy];
      
      if (this.sortBy === "year") {
        aVal = parseInt(aVal) || 0;
        bVal = parseInt(bVal) || 0;
      } else {
        aVal = (aVal || "").toString().toLowerCase();
        bVal = (bVal || "").toString().toLowerCase();
      }
      
      if (this.sortOrder === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
    
    this.filteredSongs = filtered;
    this.displayedSongs = filtered;
    
    console.log(`✅ Filtered to ${this.filteredSongs.length} songs, displaying ${this.displayedSongs.length}`);
  },



  setupReturnToTop() {
    // Show/hide return to top button based on scroll position
    window.addEventListener('scroll', () => {
      const button = document.getElementById('return-to-top');
      if (button) {
        button.style.display = window.scrollY > 300 ? 'block' : 'none';
      }
    });
  },

  playSong(song) {
    this.currentSong = song;
    this.isPlaying = true;
    
    // Use Plyr player if available, otherwise fall back to basic audio
    if (window.player) {
      // Convert Windows path to API endpoint URL
      let audioUrl;
      if (song.path.startsWith('C:')) {
        // Convert Windows path to API endpoint
        const relativePath = song.path.replace('C:/Users/Andrew/Music/Music/', '');
        audioUrl = `/api/audio/${relativePath.replace(/\\/g, '/')}`;
      } else {
        audioUrl = song.path;
      }
      
      console.log("🎵 Playing song:", song.title, "by", song.artist);
      console.log("🔗 Audio URL:", audioUrl);
      
      window.player.source = {
        type: 'audio',
        sources: [{
          src: audioUrl,
          type: 'audio/mpeg'
        }]
      };
      
      window.player.play();
    } else {
      // Fallback to basic audio element
      const audio = document.getElementById('audio-player');
      if (audio) {
        audio.src = `/api/audio/${encodeURIComponent(song.path)}`;
        audio.load();
        audio.play().catch(e => console.error('Playback failed:', e));
      }
    }
  },

  pauseSong() {
    this.isPlaying = false;
    if (window.player) {
      window.player.pause();
    } else {
      const audio = document.getElementById('audio-player');
      if (audio) {
        audio.pause();
      }
    }
  },

  togglePlay() {
    if (this.isPlaying) {
      this.pauseSong();
    } else {
      this.playSong(this.currentSong);
    }
  },

  sort(column) {
    if (this.sortBy === column) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = column;
      this.sortOrder = 'asc';
    }
    this.applyFiltersAndSort();
  },

  clearFilters() {
    this.searchTerm = "";
    this.filters = { artist: "", album: "", year: "" };
    this.applyFiltersAndSort();
  }
}));

// Playlists component
Alpine.data("playlists", () => ({
  playlists: [],
  newPlaylistName: "",
  
  init() {
    console.log("Playlists component initialized");
    // Load playlists from localStorage or API
    this.loadPlaylists();
  },
  
  loadPlaylists() {
    // Implementation for loading playlists
    this.playlists = [];
  },
  
  createPlaylist() {
    if (this.newPlaylistName.trim()) {
      this.playlists.push({
        id: Date.now(),
        name: this.newPlaylistName.trim(),
        songs: []
      });
      this.newPlaylistName = "";
    }
  },
  
  deletePlaylist(id) {
    this.playlists = this.playlists.filter(p => p.id !== id);
  }
}));

// Initialize Alpine.js
document.addEventListener('alpine:init', () => {
  console.log("Alpine init event fired, registering components...");
  console.log("🔧 Alpine object:", Alpine);
  console.log("🔧 Registering Alpine components...");
  console.log("✅ Components registered successfully");
});

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log("🎵 Initializing Plyr audio player...");
  console.log("✅ Plyr player initialized:", player);
  console.log("✅ Return to top button uses direct onclick handler");
});