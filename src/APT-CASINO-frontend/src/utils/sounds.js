/**
 * Sound utility functions for the casino app
 */

import { getSoundPath } from "./assets";

// Cache for audio objects to prevent recreation
const audioCache = {};

// Play a sound effect with options
export const playSound = (soundName, options = {}) => {
  const { volume = 1.0, loop = false, onEnd = null, cache = true } = options;

  // Check if user has muted sounds in localStorage
  const soundsMuted =
    localStorage.getItem("aptc-casino-mute-sounds") === "true";
  if (soundsMuted) return null;

  const soundPath = getSoundPath(soundName);
  let audio;

  // Use cached audio if available and caching is enabled
  if (cache && audioCache[soundPath]) {
    audio = audioCache[soundPath];
    audio.currentTime = 0; // Reset to start
  } else {
    audio = new Audio(soundPath);
    if (cache) {
      audioCache[soundPath] = audio;
    }
  }

  // Configure audio
  audio.volume = volume;
  audio.loop = loop;

  if (onEnd) {
    audio.addEventListener("ended", onEnd, { once: true });
  }

  // Play the sound (handle promise rejection gracefully)
  const playPromise = audio.play();
  if (playPromise) {
    playPromise.catch((error) => {
      console.warn(`Sound could not be played: ${error.message}`);
    });
  }

  return audio;
};

// Stop a playing sound
export const stopSound = (audio) => {
  if (audio && !audio.paused) {
    audio.pause();
    audio.currentTime = 0;
  }
};

// Preload a sound to be ready for quick playback
export const preloadSound = (soundName) => {
  const soundPath = getSoundPath(soundName);
  if (!audioCache[soundPath]) {
    audioCache[soundPath] = new Audio(soundPath);
    audioCache[soundPath].preload = "auto";
    audioCache[soundPath].load();
  }
  return audioCache[soundPath];
};

// Common casino sound effects
export const SOUNDS = {
  // UI Sounds
  buttonClick: "ui/button_click.mp3",
  notification: "ui/notification.mp3",
  success: "ui/success.mp3",
  error: "ui/error.mp3",

  // Game sounds
  spin: "games/wheel_spin.mp3",
  win: "games/win.mp3",
  jackpot: "games/jackpot.mp3",
  chips: "games/chips.mp3",
  cardDeal: "games/card_deal.mp3",
  cardShuffle: "games/card_shuffle.mp3",
  countdown: "games/countdown.mp3",

  // Mines Game
  mineClick: "games/mines/click.mp3",
  mineExplosion: "games/mines/explosion.mp3",
  gemFound: "games/mines/gem_found.mp3",

  // Wheel Game
  wheelStart: "games/wheel/start_spin.mp3",
  wheelTick: "games/wheel/tick.mp3",
  wheelStop: "games/wheel/stop.mp3",

  // Roulette
  ballRoll: "games/roulette/ball_roll.mp3",
  ballDrop: "games/roulette/ball_drop.mp3",
};
