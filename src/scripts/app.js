// src/scripts/app.js
document.addEventListener("alpine:init", () => {
  Alpine.data("library", () => ({
    searchTerm: "",
    filters: {
      artist: "",
      album: "",
      year: "",
    },
    songs: [],
    filteredSongs: [],
    sortBy: "title",
    sortDir: "asc",

    async init() {
      try {
        const response = await fetch("/songs.json");
        if (!response.ok) {
          throw new Error("Failed to fetch songs.json");
        }
        this.songs = await response.json();
        this.filteredSongs = [...this.songs];
        console.log("Library initialized:", this.filteredSongs);
      } catch (error) {
        console.error("Error loading songs:", error);
      }
    },

    applyFiltersAndSort() {
      let filtered = [...this.songs];
      if (this.searchTerm) {
        const search = this.searchTerm.toLowerCase();
        filtered = filtered.filter(song => song.title.toLowerCase().includes(search) || song.artist.toLowerCase().includes(search) || song.album.toLowerCase().includes(search));
      }
      if (this.filters.artist) {
        filtered = filtered.filter(song => song.artist.toLowerCase().includes(this.filters.artist.toLowerCase()));
      }
      if (this.filters.album) {
        filtered = filtered.filter(song => song.album.toLowerCase().includes(this.filters.album.toLowerCase()));
      }
      if (this.filters.year) {
        filtered = filtered.filter(song => song.year.toString().includes(this.filters.year));
      }
      filtered.sort((a, b) => {
        const key = this.sortBy;
        const dir = this.sortDir === "asc" ? 1 : -1;
        if (key === "duration") {
          const timeToSeconds = time => {
            const [minutes, seconds] = time.split(":").map(Number);
            return minutes * 60 + seconds;
          };
          return timeToSeconds(a[key]) > timeToSeconds(b[key]) ? dir : -dir;
        }
        return a[key] > b[key] ? dir : -dir;
      });
      this.filteredSongs = filtered;
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
});

// Initialize Plyr
document.addEventListener("DOMContentLoaded", () => {
  window.player = new Plyr("#player", {
    controls: ["play", "progress", "current-time", "mute", "volume"],
  });
});

// Playlist button handler
window.createNewPlaylist = function () {
  const name = prompt("Enter playlist name:");
  if (name) {
    const playlistList = Alpine.$data(document.getElementById("playlist-list"));
    playlistList.addPlaylist(name);
  }
};

Alpine.start();
