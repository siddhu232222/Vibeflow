const audio = document.getElementById('audio');
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const seekBar = document.getElementById('seekBar');
const titleEl = document.getElementById('title');
const progressEl = document.getElementById('progress');
const playlistEl = document.getElementById('playlist');
const playerEl = document.getElementById('player');

// YOUR SUPABASE KEYS (NEW API KEY!)
const SUPABASE_URL = 'https://hfkrqeiytdbygglmufiee.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhma3JxZWl5dGRieWdnbG11ZmVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MjAzMzUsImV4cCI6MjA3ODE5NjMzNX0.woVQEcAtfhkU_hbRqZk25mUlcR81tKLujLY_VR8r_24';
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

let songs = [];
let currentIndex = 0;
let isLocalMode = false;

// Load Shared Songs
async function loadSharedSongs() {
  const { data, error } = await supabaseClient.from('songs').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error(error);
    alert('Failed to load songs. Check internet.');
  } else {
    songs = data || [];
    renderPlaylist();
  }
}

// Load Local Songs
function loadLocalSongs() {
  songs = JSON.parse(localStorage.getItem('vibeflow_songs') || '[]');
  renderPlaylist();
}

// Toggle Mode
window.toggleMode = function() {
  isLocalMode = !isLocalMode;
  document.getElementById('modeBtn').textContent = isLocalMode ? 'Local Only' : 'Shared Library';
  if (isLocalMode) loadLocalSongs(); else loadSharedSongs();
};

// Initial Load
loadSharedSongs();

// Upload Area Click
document.getElementById('uploadArea').onclick = () => {
  if (isLocalMode) {
    document.getElementById('fileInput').click();
  } else {
    uploadToCloud();
  }
};

// Local Upload
document.getElementById('fileInput').onchange = (e) => {
  if (!isLocalMode) return;
  const files = e.target.files;
  for (let file of files) {
    if (file.type === 'audio/mpeg') {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const song = { name: file.name.replace('.mp3', ''), data: ev.target.result };
        songs.push(song);
        localStorage.setItem('vibeflow_songs', JSON.stringify(songs));
        renderPlaylist();
      };
      reader.readAsDataURL(file);
    }
  }
};

// Cloud Upload
async function uploadToCloud() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'audio/mp3';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileName = Date.now() + '_' + file.name;

    // Upload to Storage
    const { error: uploadError } = await supabaseClient.storage
      .from('vibeflow_songs')
      .upload(fileName, file);

    if (uploadError && !uploadError.message.includes('already exists')) {
      alert('Upload failed: ' + uploadError.message);
      return;
    }

    const { data: { publicUrl } } = supabaseClient.storage
      .from('vibeflow_songs')
      .getPublicUrl(fileName);

    // Save to DB
    const { error: dbError } = await supabaseClient
      .from('songs')
      .insert([{ name: file.name.replace('.mp3', ''), url: publicUrl }]);

    if (dbError) alert('Save failed: ' + dbError.message);
    else {
      alert('Song shared! Refresh to see.');
      loadSharedSongs();
    }
  };
  input.click();
}

// Render Playlist
function renderPlaylist() {
  playlistEl.innerHTML = '';
  songs.forEach((song, i) => {
    const div = document.createElement('div');
    div.className = 'song-item';
    div.innerHTML = `
      <span>${song.name}</span>
      <span>${isLocalMode ? 'Local' : 'Shared'} ${song.likes > 0 ? '❤️ ' + song.likes : ''}</span>
    `;
    div.onclick = () => playSong(i);
    playlistEl.appendChild(div);
  });
  if (songs.length > 0) playerEl.classList.remove('hidden');
}

// Play Song
function playSong(index) {
  currentIndex = index;
  const song = songs[index];
  audio.src = isLocalMode ? song.data : song.url;
  titleEl.textContent = song.name;
  updatePlayingClass();
  audio.play();
  playBtn.textContent = 'Pause';
}

function updatePlayingClass() {
  document.querySelectorAll('.song-item').forEach((el, i) => {
    el.classList.toggle('playing', i === currentIndex);
  });
}

// Controls
playBtn.onclick = () => {
  if (audio.paused) { audio.play(); playBtn.textContent = 'Pause'; }
  else { audio.pause(); playBtn.textContent = 'Play'; }
};

prevBtn.onclick = () => { currentIndex = (currentIndex - 1 + songs.length) % songs.length; playSong(currentIndex); };
nextBtn.onclick = () => { currentIndex = (currentIndex + 1) % songs.length; playSong(currentIndex); };

audio.ontimeupdate = () => {
  if (audio.duration) {
    const progress = (audio.currentTime / audio.duration) * 100;
    seekBar.value = progress;
    progressEl.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
  }
};

seekBar.oninput = () => { audio.currentTime = (seekBar.value / 100) * audio.duration; };
audio.onended = () => nextBtn.click();

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}