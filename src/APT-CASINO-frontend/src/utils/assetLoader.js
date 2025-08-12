import { ASSETS } from "./assets";
import { preloadSound, SOUNDS } from "./sounds";

/**
 * Preload critical assets to improve user experience
 * This function preloads important images and sounds that are needed early in the app
 */
export const preloadCriticalAssets = () => {
  // Preload important images
  const criticalImages = [
    ASSETS.powerPlay,
    ASSETS.images.hero,
    ASSETS.games.roulette,
    ASSETS.games.blackjack,
    ASSETS.games.mines,
  ];

  criticalImages.forEach((src) => {
    const img = new Image();
    img.src = src;
  });

  // Preload important sounds
  const criticalSounds = [SOUNDS.buttonClick, SOUNDS.notification, SOUNDS.win];

  criticalSounds.forEach((sound) => {
    preloadSound(sound);
  });
};

/**
 * Initialize asset loading
 * Call this function early in your application bootstrap process
 */
export const initializeAssets = () => {
  // Preload critical assets immediately
  preloadCriticalAssets();

  // Additional initialization can go here
  console.log("🎮 Assets initialized");
};
