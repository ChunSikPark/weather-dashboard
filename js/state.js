/**
 * Global state management for the weather dashboard.
 * All components read/write through this shared state object.
 */
const State = {
  // Current selection
  selectedISO: 'ERCOT',
  currentTimestep: 0,

  // Playback
  isPlaying: false,
  playbackSpeed: 1, // 1, 2, or 5
  _intervalId: null,

  // Data (populated by app.js on load)
  weatherData: {},  // { ISO_NAME: [ {datetime_utc, wind_speed_mph, ...}, ... ] }
  isoList: [],
  geojson: null,

  // Computed
  get totalTimesteps() {
    const data = this.weatherData[this.selectedISO];
    return data ? data.length : 0;
  },

  get currentData() {
    const data = this.weatherData[this.selectedISO];
    return data ? data[this.currentTimestep] : null;
  },

  get isoTimeseries() {
    return this.weatherData[this.selectedISO] || [];
  },

  // Actions
  setISO(iso) {
    this.selectedISO = iso;
    // Keep current timestep — all ISOs share the same timeline
    this._notify();
  },

  setTimestep(step) {
    this.currentTimestep = Math.max(0, Math.min(step, this.totalTimesteps - 1));
    this._notify();
  },

  stepForward() {
    this.currentTimestep = (this.currentTimestep + 1) % this.totalTimesteps;
    this._notify();
  },

  stepBack() {
    this.currentTimestep = (this.currentTimestep - 1 + this.totalTimesteps) % this.totalTimesteps;
    this._notify();
  },

  togglePlay() {
    this.isPlaying = !this.isPlaying;
    if (this.isPlaying) {
      this._startPlayback();
    } else {
      this._stopPlayback();
    }
    this._notify();
  },

  setSpeed(speed) {
    this.playbackSpeed = speed;
    if (this.isPlaying) {
      this._stopPlayback();
      this._startPlayback();
    }
    this._notify();
  },

  _startPlayback() {
    this._stopPlayback();
    const ms = 1000 / this.playbackSpeed;
    this._intervalId = setInterval(() => this.stepForward(), ms);
  },

  _stopPlayback() {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  },

  // Observer pattern
  _listeners: [],

  subscribe(fn) {
    this._listeners.push(fn);
    return () => {
      this._listeners = this._listeners.filter(l => l !== fn);
    };
  },

  _notify() {
    for (const fn of this._listeners) {
      fn(this);
    }
  }
};
