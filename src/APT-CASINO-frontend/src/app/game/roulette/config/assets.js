/**
 * Roulette game specific assets utility
 */

import { ASSETS } from "../../../../utils/assets";
import { playSound } from "../../../../utils/sounds";

// Specific roulette game assets
export const ROULETTE_ASSETS = {
  // Images
  images: {
    rouletteTable: "/images/games/roulette.png",
    rouletteWheel: "/images/games/roulette-wheel.png",
    chip: "/images/chip.png",
  },

  // Sounds
  sounds: {
    ballSpin: "/sounds/ball-spin.mp3",
    chipPut: "/sounds/chip-put.mp3",
    chipSelect: "/sounds/chip-select.mp3",
    win: "/sounds/win.mp3",
    winChips: "/sounds/win-chips.mp3",
    bet: "/sounds/bet.mp3",
  },
};

// Sound functions specific to roulette game
export const playRouletteSound = (soundName, options = {}) => {
  const fullPath = ROULETTE_ASSETS.sounds[soundName];
  if (!fullPath) {
    console.warn(`Sound "${soundName}" not found in roulette assets`);
    return null;
  }

  return playSound(fullPath, options);
};

// Sound effect functions for specific game actions
export const rouletteSoundEffects = {
  playBallSpin: () => playRouletteSound("ballSpin", { volume: 0.6 }),
  playChipPut: () => playRouletteSound("chipPut", { volume: 0.5 }),
  playChipSelect: () => playRouletteSound("chipSelect", { volume: 0.5 }),
  playWin: () => playRouletteSound("win", { volume: 0.7 }),
  playWinChips: () => playRouletteSound("winChips", { volume: 0.6 }),
  playBet: () => playRouletteSound("bet", { volume: 0.5 }),
};

// Preload roulette game assets
export const preloadRouletteAssets = () => {
  // Preload images
  Object.values(ROULETTE_ASSETS.images).forEach((imagePath) => {
    const img = new Image();
    img.src = imagePath;
  });

  // Preload sounds
  Object.values(ROULETTE_ASSETS.sounds).forEach((soundPath) => {
    const audio = new Audio();
    audio.src = soundPath;
    audio.preload = "auto";
  });
};
