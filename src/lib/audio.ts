// Audio management for SKI FALL

import startMusic from '../assets/audio/start.mp3';
import gameMusic from '../assets/audio/game.mp3';

type Track = 'start' | 'game' | null;

class AudioManager {
  private startAudio: HTMLAudioElement;
  private gameAudio: HTMLAudioElement;
  private currentTrack: Track = null;
  private isMuted = false;

  constructor() {
    this.startAudio = new Audio(startMusic);
    this.gameAudio = new Audio(gameMusic);
    
    // Loop both tracks
    this.startAudio.loop = true;
    this.gameAudio.loop = true;
    
    // Set volume
    this.startAudio.volume = 0.5;
    this.gameAudio.volume = 0.4;
  }

  play(track: Track) {
    if (track === null) {
      this.stop();
      return;
    }
    
    if (this.isMuted) {
      this.currentTrack = track;
      return;
    }

    const audio = track === 'start' ? this.startAudio : this.gameAudio;
    const otherAudio = track === 'start' ? this.gameAudio : this.startAudio;
    
    // Stop the other track
    otherAudio.pause();
    
    // If already playing this track, don't restart
    if (track === this.currentTrack && !audio.paused) {
      return;
    }
    
    // Reset to beginning and play
    audio.currentTime = 0;
    audio.play()
      .then(() => {
        this.currentTrack = track;
      })
      .catch((err) => {
        console.warn('[Audio] Play blocked:', err.message);
        // Don't set currentTrack so we can retry on next user interaction
      });
  }

  stop() {
    this.startAudio.pause();
    this.gameAudio.pause();
    this.startAudio.currentTime = 0;
    this.gameAudio.currentTime = 0;
    this.currentTrack = null;
  }

  mute() {
    this.isMuted = true;
    this.startAudio.muted = true;
    this.gameAudio.muted = true;
  }

  unmute() {
    this.isMuted = false;
    this.startAudio.muted = false;
    this.gameAudio.muted = false;
  }

  toggleMute(): boolean {
    if (this.isMuted) {
      this.unmute();
    } else {
      this.mute();
    }
    return this.isMuted;
  }

  getIsMuted(): boolean {
    return this.isMuted;
  }

  getCurrentTrack(): Track {
    return this.currentTrack;
  }
}

// Singleton instance
export const audioManager = new AudioManager();

