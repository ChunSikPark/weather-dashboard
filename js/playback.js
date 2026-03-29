/**
 * Playback controls: play/pause, step, scrubber, speed.
 * Wires DOM elements to State actions.
 */

function initPlayback() {
  const btnPlay = document.getElementById('btn-play');
  const btnBack = document.getElementById('btn-back');
  const btnForward = document.getElementById('btn-forward');
  const scrubber = document.getElementById('scrubber');
  const speedButtons = document.querySelectorAll('.speed-btn');

  btnPlay.addEventListener('click', () => State.togglePlay());
  btnBack.addEventListener('click', () => State.stepBack());
  btnForward.addEventListener('click', () => State.stepForward());

  scrubber.addEventListener('input', (e) => {
    State.setTimestep(parseInt(e.target.value));
  });

  speedButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const speed = parseInt(btn.dataset.speed);
      State.setSpeed(speed);
    });
  });

  // Subscribe to state changes to update UI
  State.subscribe(updatePlaybackUI);
}

function updatePlaybackUI(state) {
  const playIcon = document.getElementById('play-icon');
  const playLabel = document.getElementById('play-label');
  const scrubber = document.getElementById('scrubber');
  const timestampLabel = document.getElementById('timestamp-label');
  const speedButtons = document.querySelectorAll('.speed-btn');

  // Play/pause
  playIcon.innerHTML = state.isPlaying ? '&#9646;&#9646;' : '&#9654;';
  playLabel.textContent = state.isPlaying ? 'PAUSE' : 'PLAY';

  // Scrubber
  scrubber.max = state.totalTimesteps - 1;
  scrubber.value = state.currentTimestep;

  // Timestamp
  const row = state.currentData;
  if (row && row.datetime_utc) {
    const d = new Date(row.datetime_utc);
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const hour = String(d.getUTCHours()).padStart(2, '0');
    const min = String(d.getUTCMinutes()).padStart(2, '0');
    timestampLabel.textContent = `${month}/${day} ${hour}:${min} UTC`;
  } else {
    timestampLabel.textContent = '--';
  }

  // Speed buttons
  speedButtons.forEach(btn => {
    const speed = parseInt(btn.dataset.speed);
    btn.classList.toggle('active', speed === state.playbackSpeed);
  });
}
