/**
 * Mines game specific assets utility
 */

import { ASSETS } from "../../../../utils/assets";
import { playSound, SOUNDS } from "../../../../utils/sounds";

// Specific mines game assets
export const MINES_ASSETS = {
  // Images
  images: {
    mine: "/images/mine.png",
    gem: "/images/gem.png",
    diamond: "/images/diamond.png",
    bomb: "/images/bomb.png",
    question: "/images/question.png",
    rubies: "/images/Rubies.png",
  },

  // Sounds
  sounds: {
    click: "/sounds/click.mp3",
    explosion: "/sounds/explosion.mp3",
    gem: "/sounds/gem.mp3",
    reveal: "/sounds/reveal.mp3",
    win: "/sounds/win.mp3",
    cashout: "/sounds/cashout.mp3",
    bet: "/sounds/bet.mp3",
  },
};

// Sound functions specific to mines game
export const playMinesSound = (soundName, options = {}) => {
  const fullPath = MINES_ASSETS.sounds[soundName];
  if (!fullPath) {
    console.warn(`Sound "${soundName}" not found in mines assets`);
    return null;
  }

  return playSound(fullPath, options);
};

// Sound effect functions for specific game actions
export const minesSoundEffects = {
  playGemReveal: () => playMinesSound("gem", { volume: 0.6 }),
  playBombExplosion: () => playMinesSound("explosion", { volume: 0.7 }),
  playClickTile: () => playMinesSound("click", { volume: 0.5 }),
  playWin: () => playMinesSound("win", { volume: 0.8 }),
  playCashout: () => playMinesSound("cashout", { volume: 0.6 }),
  playBet: () => playMinesSound("bet", { volume: 0.5 }),
};

// Preload mines game assets
export const preloadMinesAssets = () => {
  // Preload images
  Object.values(MINES_ASSETS.images).forEach((imagePath) => {
    const img = new Image();
    img.src = imagePath;
  });

  // Preload sounds
  Object.values(MINES_ASSETS.sounds).forEach((soundPath) => {
    const audio = new Audio();
    audio.src = soundPath;
    audio.preload = "auto";
  });
};
