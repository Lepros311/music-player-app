            // Initialize Plyr audio player
            let player = null;

            document.addEventListener('DOMContentLoaded', () => {
              console.log("🎵 Initializing Plyr audio player...");
              const audioElement = document.getElementById('audio-player');
              if (audioElement && window.Plyr) {
                player = new Plyr(audioElement, {
                  controls: ['play', 'progress', 'current-time', 'duration', 'mute', 'volume'],
                  settings: ['speed'],
                  speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] }
                });
                window.player = player;
                console.log("✅ Plyr player initialized:", player);
              } else {
                console.error("❌ Failed to initialize Plyr player - audio element or Plyr not found");
              }

              console.log("✅ Return to top button uses direct onclick handler");
            });


// Alpine.js components
document.addEventListener("alpine:init", () => {
  console.log("🔧 Alpine init event fired, registering components...");
  console.log("🔧 Alpine object:", Alpine);
  console.log("🔧 Registering Alpine components...");

  Alpine.data("library", () => ({
    // Search and filters
    searchTerm: "",
    filters: {
      artist: "",
      album: "",
      year: ""
    },
    
    // All songs data
    allSongs: [],
    filteredSongs: [],
    displayedSongs: [],
    
    // Sorting
    sortBy: "artist",
    sortDir: "asc",
    
            // Lazy loading
            itemsPerPage: 100,
            currentDisplayCount: 100,
                isLoadingMore: false,
                loadMoreObserver: null,
                
                // Return to top
                showReturnToTop: false,
                headerObserver: null,
    
    // Stats
    totalSongs: 0,

    // Play/Pause functionality
    playSong(song) {
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
        
        // Store current song info on the player for comparison
        if (!window.player.currentSong) {
          window.player.currentSong = null;
        }
        
        const isSameSong = window.player.currentSong === audioUrl;
        const isPlaying = !window.player.paused;
        
        if (isSameSong) {
          // Same song is loaded, just toggle play/pause
          if (isPlaying) {
            console.log("⏸️ Pausing song:", song.title);
            window.player.pause();
          } else {
            console.log("▶️ Resuming song:", song.title);
            window.player.play();
          }
        } else {
          // Different song, load and play this song
          console.log("🎵 Playing song:", song.title, "by", song.artist);
          console.log("🔗 Audio URL:", audioUrl);
          
          window.player.source = {
            type: 'audio',
            sources: [{
              src: audioUrl,
              type: 'audio/mpeg'
            }]
          };
          
          // Store the current song URL for future comparison
          window.player.currentSong = audioUrl;
          window.player.play();
        }
      } else {
        console.error("❌ Player not initialized yet");
      }
    },


                async init() {
                  try {
                    console.log("🚀 Library component init() called!");
                    console.log("🔍 Alpine.js component initialized");
                    // Load all songs initially
                    await this.loadAllSongs();
                    console.log("Library initialized with songs loaded");
                    
                    // Set up automatic lazy loading
                    this.setupLazyLoading();
                    
                    // Set up return to top button
                    this.setupReturnToTop();
                  } catch (error) {
                    console.error("Error initializing library:", error);
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
        this.totalSongs = data.totalSongs;
        
        console.log(`Loaded ${this.allSongs.length} songs total`);
        
        // Initial filtering and display
        this.applyFiltersAndSort();
      } catch (error) {
        console.error("Error loading songs:", error);
        this.allSongs = [];
        this.filteredSongs = [];
        this.displayedSongs = [];
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
        const searchLower = this.searchTerm.toLowerCase();
        filtered = filtered.filter(song =>
          song.title.toLowerCase().includes(searchLower) ||
          song.artist.toLowerCase().includes(searchLower) ||
          song.album.toLowerCase().includes(searchLower)
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
          song.year.toString().includes(this.filters.year)
        );
      }

      // Apply sorting
      filtered.sort((a, b) => {
        let aVal = a[this.sortBy];
        let bVal = b[this.sortBy];

        if (this.sortBy === 'duration') {
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

        if (aVal > bVal) return this.sortDir === 'asc' ? 1 : -1;
        if (aVal < bVal) return this.sortDir === 'asc' ? -1 : 1;
        return 0;
      });

      this.filteredSongs = filtered;
      this.displayedSongs = filtered.slice(0, this.currentDisplayCount);
      
      console.log(`✅ Filtered to ${this.filteredSongs.length} songs, displaying ${this.displayedSongs.length}`);
    },

    async sort(column) {
      if (this.sortBy === column) {
        this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        this.sortBy = column;
        this.sortDir = 'asc';
      }
      
      this.applyFiltersAndSort();
    },

                setupLazyLoading() {
                  // Create a sentinel element at the bottom of the page
                  this.$nextTick(() => {
                    const sentinel = document.getElementById('load-more-sentinel');
                    if (sentinel && 'IntersectionObserver' in window) {
                      this.loadMoreObserver = new IntersectionObserver((entries) => {
                        entries.forEach(entry => {
                          if (entry.isIntersecting && this.hasMoreSongs && !this.isLoadingMore) {
                            console.log('🔄 Auto-loading more songs...');
                            this.loadMore();
                          }
                        });
                      }, {
                        root: null,
                        rootMargin: '100px', // Start loading when 100px away from the sentinel
                        threshold: 0.1
                      });
                      
                      this.loadMoreObserver.observe(sentinel);
                      console.log('👀 Lazy loading observer set up');
                    }
                  });
                },

            setupReturnToTop() {
              // Ensure button starts hidden
              this.showReturnToTop = false;
              
              this.$nextTick(() => {
                const tableHeader = document.querySelector('.table-dark');
                if (tableHeader && 'IntersectionObserver' in window) {
                  this.headerObserver = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                      this.showReturnToTop = !entry.isIntersecting;
                    });
                  }, {
                    root: null,
                    rootMargin: '0px',
                    threshold: 0
                  });
                  
                  this.headerObserver.observe(tableHeader);
                }
              });
            },

                returnToTop() {
                  window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                  });
                },

                loadMore() {
                  if (this.isLoadingMore || this.displayedSongs.length >= this.filteredSongs.length) {
                    return;
                  }
                  
                  this.isLoadingMore = true;
                  
                  // Simulate a small delay for smooth loading
                  setTimeout(() => {
                    const newCount = Math.min(
                      this.currentDisplayCount + this.itemsPerPage,
                      this.filteredSongs.length
                    );
                    
                    this.currentDisplayCount = newCount;
                    this.displayedSongs = this.filteredSongs.slice(0, newCount);
                    this.isLoadingMore = false;
                    
                    console.log(`📄 Loaded more songs, now showing ${this.displayedSongs.length} of ${this.filteredSongs.length}`);
                  }, 100);
                },

    get hasMoreSongs() {
      return this.displayedSongs.length < this.filteredSongs.length;
    },

    get remainingSongs() {
      return this.filteredSongs.length - this.displayedSongs.length;
    },

    scrollToTop() {
      console.log('📍 Current scroll position before:', window.pageYOffset);
      
      // Try multiple methods to ensure scrolling works
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      
      // Force scroll with multiple attempts
      setTimeout(() => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        console.log('📍 Scroll position after first attempt:', window.pageYOffset);
      }, 10);
      
      setTimeout(() => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        console.log('📍 Scroll position after second attempt:', window.pageYOffset);
      }, 50);
      
      setTimeout(() => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        console.log('📍 Final scroll position:', window.pageYOffset);
      }, 100);
    }
  }));

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
        this.savePlaylists();
      }
    },
    
    savePlaylists() {
      localStorage.setItem('playlists', JSON.stringify(this.playlists));
    }
  }));

  console.log("✅ Components registered successfully");
});

// Fallback registration if Alpine is already loaded
if (typeof Alpine !== 'undefined') {
  console.log("🔧 Alpine already loaded, registering components immediately");
  // Components are already registered above
}