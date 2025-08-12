/**
 * Wheel game specific assets utility
 */

import { ASSETS } from "../../../../utils/assets";
import { playSound } from "../../../../utils/sounds";

// Specific wheel game assets
export const WHEEL_ASSETS = {
  // Images
  images: {
    wheelBackground: "/images/games/wheel-bg.png",
    wheelPointer: "/images/games/wheel-pointer.png",
    wheelCenter: "/images/games/wheel-center.png",
    coins: "/images/coin-stack.png",
  },

  // Sounds
  sounds: {
    wheelSpin: "/sounds/ball-spin.mp3", // Reusing the ball spin sound for wheel
    tick: "/sounds/click.mp3",
    win: "/sounds/win.mp3",
    bet: "/sounds/bet.mp3",
    cashout: "/sounds/cashout.mp3",
  },
};

// Sound functions specific to wheel game
export const playWheelSound = (soundName, options = {}) => {
  const fullPath = WHEEL_ASSETS.sounds[soundName];
  if (!fullPath) {
    console.warn(`Sound "${soundName}" not found in wheel assets`);
    return null;
  }

  return playSound(fullPath, options);
};

// Sound effect functions for specific game actions
export const wheelSoundEffects = {
  playWheelSpin: () => playWheelSound("wheelSpin", { volume: 0.6 }),
  playTick: () => playWheelSound("tick", { volume: 0.3 }),
  playWin: () => playWheelSound("win", { volume: 0.7 }),
  playBet: () => playWheelSound("bet", { volume: 0.5 }),
  playCashout: () => playWheelSound("cashout", { volume: 0.6 }),
};

// Preload wheel game assets
export const preloadWheelAssets = () => {
  // Preload images
  Object.values(WHEEL_ASSETS.images).forEach((imagePath) => {
    const img = new Image();
    img.src = imagePath;
  });

  // Preload sounds
  Object.values(WHEEL_ASSETS.sounds).forEach((soundPath) => {
    const audio = new Audio();
    audio.src = soundPath;
    audio.preload = "auto";
  });
};
