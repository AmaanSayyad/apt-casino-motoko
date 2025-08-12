/**
 * Asset utility functions to help with referencing assets from the public folder
 */

// Get path to image asset
export const getImagePath = (imagePath) => {
  return `/images/${imagePath}`;
};

// Get path to game image asset
export const getGameImagePath = (gameName) => {
  return `/images/games/${gameName}`;
};

// Get path to icon asset
export const getIconPath = (iconName) => {
  return `/icons/${iconName}`;
};

// Get path to sound asset
export const getSoundPath = (soundName) => {
  return `/sounds/${soundName}`;
};

// Get path to logo asset
export const getLogoPath = (logoName) => {
  return `/logos/${logoName}`;
};

// Common assets paths
export const ASSETS = {
  powerPlay: "/PowerPlay.png",
  nextSvg: "/next.svg",
  vercelSvg: "/vercel.svg",

  // Icons
  socialIcons: {
    discord: "/icons/discord.svg",
    facebook: "/icons/facebook.png",
    github: "/icons/github.svg",
    instagram: "/icons/instagram.png",
    telegram: "/icons/telegram.svg",
    twitter: "/icons/twitter.svg",
  },

  // Game assets
  games: {
    roulette: "/images/games/roulette.png",
    blackjack: "/images/games/blackjack.png",
    poker: "/images/games/poker.png",
    mines: "/images/games/mines.png",
    fortuneTiger: "/images/games/fortune-tiger.png",
    crash: "/images/games/crash.png",
    dices: "/images/games/dices.png",
    carpDiem: "/images/games/Carp_diem.png",
    fireInTheHole: "/images/games/fire_in_the_hole.png",
    firePortal: "/images/games/fire_portal.png",
    gatesOfOlympus: "/images/games/gates-of-olympus.png",
    revengeOfLoki: "/images/games/revenge_of_loki.png",
    sugarRush: "/images/games/sugar_rush.png",
  },

  // Game item assets
  gameItems: {
    diamond: "/images/diamond.png",
    gem: "/images/gem.png",
    mine: "/images/mine.png",
    bomb: "/images/bomb.png",
    question: "/images/question.png",
  },

  // Other images
  images: {
    hero: "/images/HeroImage.png",
    avatar: "/images/avatar.png",
    casinoPlayers: "/images/casino-players.png",
    avax: "/images/Avax.png",
    polygon: "/images/Polygon.png",
    rubies: "/images/Rubies.png",
    hotlineMiami: "/images/HotlineMiami.png",
  },
};
