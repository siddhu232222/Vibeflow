const audio = document.getElementById('audio');
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const seekBar = document.getElementById('seekBar');
const titleEl = document.getElementById('title');
const progressEl = document.getElementById('progress');
const playlistEl = document.getElementById('playlist');
const playerEl = document.getElementById('player');

let songs = JSON.parse(localStorage.getItem('vibeflow_songs') || '[]');
let currentIndex = 0;

renderPlaylist();

document.getElementById('uploadArea').onclick = () => 
  document.getElementById('fileInput').click();

document.getElementById('fileInput').onchange = (e) => {
  const files = e.target.files;
  for (let file of files) {
    if (file.type === 'audio/mpeg') {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const song = {
          name: file.name.replace('.mp3', ''),
          data: ev.target.result
        };
        songs.push(song);
        saveAndRender();
      };
      reader.readAsDataURL(file);
    }
  }
};

function saveAndRender() {
  localStorage.setItem('vibeflow_songs', JSON.stringify(songs));
  renderPlaylist();
}

function renderPlaylist() {
  playlistEl.innerHTML = '';
  songs.forEach((song, i) => {
    const div = document.createElement('div');
    div.className = 'song-item';
    div.innerHTML = `<span>${song.name}</span><span>Saved</span>`;
    div.onclick = () => playSong(i);
    playlistEl.appendChild(div);
  });
  if (songs.length > 0) playerEl.classList.remove('hidden');
}

function playSong(index) {
  currentIndex = index;
  const song = songs[index];
  audio.src = song.data;
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

playBtn.onclick = () => {
  if (audio.paused) {
    audio.play();
    playBtn.textContent = 'Pause';
  } else {
    audio.pause();
    playBtn.textContent = 'Play';
  }
};

prevBtn.onclick = () => {
  currentIndex = (currentIndex - 1 + songs.length) % songs.length;
  playSong(currentIndex);
};

nextBtn.onclick = () => {
  currentIndex = (currentIndex + 1) % songs.length;
  playSong(currentIndex);
};

audio.ontimeupdate = () => {
  if (audio.duration) {
    const progress = (audio.currentTime / audio.duration) * 100;
    seekBar.value = progress;
    progressEl.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
  }
};

seekBar.oninput = () => {
  const time = (seekBar.value / 100) * audio.duration;
  audio.currentTime = time;
};

audio.onended = () => {
  nextBtn.click();
};

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}