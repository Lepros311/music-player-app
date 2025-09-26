// src/scripts/app.js
function registerAlpineComponents(Alpine) {
  Alpine.data("library", () => ({
    searchTerm: "",
    filters: {
      artist: "",
      album: "",
      year: "",
    },
    songs: [],
    sortBy: "artist",
    sortDir: "asc",
    
    // Pagination
    currentPage: 1,
    itemsPerPage: 50,
    totalPages: 1,
    totalSongs: 0,
    
    // Loading state
    isLoading: false,

    async init() {
      try {
        console.log("🚀 Initializing library...");
        // Load songs initially
        await this.loadSongs();
        console.log("Library initialized with songs loaded");
      } catch (error) {
        console.error("Error loading songs:", error);
      }
    },

    async loadSongs() {
      this.isLoading = true;
      try {
        // Build URL manually like the test button
        const url = `/api/songs?page=${this.currentPage}&limit=${this.itemsPerPage}&search=${encodeURIComponent(this.searchTerm)}&artist=${encodeURIComponent(this.filters.artist)}&album=${encodeURIComponent(this.filters.album)}&year=${encodeURIComponent(this.filters.year)}&sortBy=${this.sortBy}&sortDir=${this.sortDir}&requestId=${Date.now()}`;
        
        console.log('🚀 Sending API request with URL:', url);
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Failed to fetch songs from API");
        }
        
        const data = await response.json();
        this.songs = data.songs;
        
        // Update pagination info
        this.totalPages = data.pagination.totalPages;
        this.totalSongs = data.pagination.totalSongs;
        
        console.log(`Loaded ${this.songs.length} songs (page ${this.currentPage} of ${this.totalPages})`);
      } catch (error) {
        console.error("Error loading songs:", error);
        this.songs = [];
      } finally {
        this.isLoading = false;
      }
    },

    async applyFiltersAndSort() {
      console.log('🔍 Applying filters:', { 
        searchTerm: this.searchTerm, 
        artist: this.filters.artist,
        album: this.filters.album,
        year: this.filters.year
      });
      
      this.currentPage = 1;
      
      // Call API directly like the test button
      try {
        const url = `/api/songs?page=${this.currentPage}&limit=${this.itemsPerPage}&search=${encodeURIComponent(this.searchTerm)}&artist=${encodeURIComponent(this.filters.artist)}&album=${encodeURIComponent(this.filters.album)}&year=${encodeURIComponent(this.filters.year)}&sortBy=${this.sortBy}&sortDir=${this.sortDir}&requestId=${Date.now()}`;
        
        console.log('🚀 Direct API call with URL:', url);
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Failed to fetch songs from API");
        }
        
        const data = await response.json();
        this.songs = data.songs;
        this.totalSongs = data.pagination.totalSongs;
        this.totalPages = data.pagination.totalPages;
        
        console.log(`✅ Loaded ${this.songs.length} songs from direct API call`);
      } catch (error) {
        console.error("Error in direct API call:", error);
        this.songs = [];
      }
    },

    async sort(column) {
      if (this.sortBy === column) {
        this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        this.sortBy = column;
        this.sortDir = 'asc';
      }
      this.currentPage = 1;
      await this.loadSongs();
    },

    updatePagination() {
      // Pagination is now handled by the API
      // This method is kept for compatibility but does nothing
    },

    get paginatedSongs() {
      return this.songs; // API already returns paginated results
    },

    async nextPage() {
      if (this.currentPage < this.totalPages) {
        this.currentPage++;
        await this.loadSongs();
      }
    },

    async prevPage() {
      if (this.currentPage > 1) {
        this.currentPage--;
        await this.loadSongs();
      }
    },

    async goToPage(page) {
      if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page;
        await this.loadSongs();
      }
    },

    async testAPI() {
      console.log("🧪 Testing API directly...");
      try {
        const response = await fetch('/api/songs?page=1&limit=50&search=&artist=Test&album=&year=&sortBy=artist&sortDir=asc&requestId=test123');
        const data = await response.json();
        console.log("🧪 API Response:", data);
        this.songs = data.songs;
        this.totalSongs = data.pagination.totalSongs;
        this.totalPages = data.pagination.totalPages;
        console.log(`🧪 Loaded ${data.songs.length} songs from test API call`);
      } catch (error) {
        console.error("🧪 Test API Error:", error);
      }
    },
  }));

  // Playlist component for the sidebar
  Alpine.data("playlists", () => ({
    playlists: [],
    init() {
      this.playlists = JSON.parse(localStorage.getItem("playlists")) || [];
    },
    addPlaylist(name) {
      this.playlists.push({ id: Date.now(), name, songs: [] });
      localStorage.setItem("playlists", JSON.stringify(this.playlists));
    },
  }));
}

// Ensure we register components regardless of Alpine load order
if (window.Alpine) {
  registerAlpineComponents(window.Alpine);
} else {
  document.addEventListener("alpine:init", () => {
    registerAlpineComponents(window.Alpine);
  });
}

// Initialize Plyr
document.addEventListener("DOMContentLoaded", () => {
  window.player = new Plyr("#player", {
    controls: ["play", "progress", "current-time", "mute", "volume"],
  });

  // Sidebar toggle persistence
  const collapsed = localStorage.getItem('sidebar-collapsed') === 'true';
  document.body.classList.toggle('sidebar-collapsed', collapsed);
});

// Playlist button handler
window.createNewPlaylist = function () {
  const name = prompt("Enter playlist name:");
  if (name) {
    const listEl = document.getElementById("playlist-list");
    const comp = Alpine.$data(listEl) || Alpine.$data(listEl.closest('[x-data]'));
    if (comp && typeof comp.addPlaylist === 'function') {
      comp.addPlaylist(name);
    }
  }
};

// Global sidebar toggle
window.toggleSidebar = function () {
  const isCollapsed = document.body.classList.toggle('sidebar-collapsed');
  localStorage.setItem('sidebar-collapsed', String(isCollapsed));
};



