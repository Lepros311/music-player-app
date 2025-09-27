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
  isLoading: true,
  searchTerm: "",
  sortBy: "artist",
  sortOrder: "asc",
  currentDisplayCount: 100,
  itemsPerPage: 100,
  
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
      console.log("🔍 Initial isLoading state:", this.isLoading);
      // Load all songs initially
      await this.loadAllSongs();
      console.log("Library initialized with songs loaded");
      
      // Set up automatic lazy loading
      this.setupLazyLoading();
      
      // Set up return to top button
      this.setupReturnToTop();
    } catch (error) {
      console.error("Error initializing library:", error);
      // Hide loading modal even if there's an error
      this.isLoading = false;
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
      
      // Hide loading modal after songs are loaded
      console.log("🎉 Songs loaded successfully, hiding loading modal");
      this.isLoading = false;
    } catch (error) {
      console.error("Error loading songs:", error);
      this.allSongs = [];
      this.filteredSongs = [];
      this.displayedSongs = [];
      // Hide loading modal even if there's an error
      console.log("❌ Error loading songs, hiding loading modal");
      this.isLoading = false;
    }
  },

  applyFiltersAndSort() {
    console.log('🔍 Applying filters:', { 
      searchTerm: this.searchTerm, 
      artist: this.filters.artist,
      album: this.filters.album,
      year: this.filters.year
    });
    
    // Reset display count
    this.currentDisplayCount = this.itemsPerPage;
    
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
    this.displayedSongs = filtered.slice(0, this.currentDisplayCount);
    
    console.log(`✅ Filtered to ${this.filteredSongs.length} songs, displaying ${this.displayedSongs.length}`);
  },

  setupLazyLoading() {
    // Create sentinel element for lazy loading
    const sentinel = document.createElement('div');
    sentinel.id = 'load-more-sentinel';
    sentinel.style.height = '20px';
    sentinel.style.background = 'transparent';
    sentinel.innerHTML = '<div class="text-center text-muted py-3">Loading more songs...</div>';
    
    // Add sentinel to the end of the song list
    const songList = document.getElementById('song-list');
    if (songList) {
      songList.appendChild(sentinel);
      
      // Set up intersection observer
      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting && this.displayedSongs.length < this.filteredSongs.length) {
              console.log('👀 Loading more songs...');
              this.loadMore();
            }
          });
        }, {
          rootMargin: '200px',
          threshold: 0.1
        });
        
        observer.observe(sentinel);
        console.log('👀 Lazy loading observer set up');
      } else {
        console.error('❌ IntersectionObserver not supported');
      }
    }
  },

  loadMore() {
    const startIndex = this.displayedSongs.length;
    const endIndex = Math.min(startIndex + this.itemsPerPage, this.filteredSongs.length);
    
    if (startIndex < this.filteredSongs.length) {
      const newSongs = this.filteredSongs.slice(startIndex, endIndex);
      this.displayedSongs = [...this.displayedSongs, ...newSongs];
      console.log(`Loaded ${newSongs.length} more songs (${this.displayedSongs.length}/${this.filteredSongs.length} total)`);
    }
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
    
    // Update audio source
    const audio = document.getElementById('audio-player');
    if (audio) {
      audio.src = `/api/audio/${encodeURIComponent(song.path)}`;
      audio.load();
      audio.play().catch(e => console.error('Playback failed:', e));
    }
  },

  pauseSong() {
    this.isPlaying = false;
    const audio = document.getElementById('audio-player');
    if (audio) {
      audio.pause();
    }
  },

  togglePlay() {
    if (this.isPlaying) {
      this.pauseSong();
    } else {
      this.playSong(this.currentSong);
    }
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