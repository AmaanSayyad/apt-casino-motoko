/**
 * Common game utilities shared across all casino games
 */

import React from "react";
import { ASSETS } from "../../../utils/assets";
import { playSound, SOUNDS } from "../../../utils/sounds";

// Game loading screen component
export const GameLoadingScreen = ({
  gameName = "Game",
  loadingText = "Loading game assets...",
}) => {
  return (
    <div className="fixed top-0 left-0 w-full h-full flex flex-col items-center justify-center bg-black bg-opacity-90 z-50">
      <div className="w-24 h-24 mb-4 relative">
        <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-purple-500 border-t-transparent animate-spin"></div>
        <img
          src={ASSETS.powerPlay}
          alt="Game Logo"
          className="w-16 h-16 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
        />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">{gameName}</h2>
      <p className="text-gray-300">{loadingText}</p>
    </div>
  );
};

// Game transition effects
export const gameTransitionEffects = {
  playGameStart: () => playSound(SOUNDS.win, { volume: 0.5 }),
  playGameEnd: () => playSound(SOUNDS.bet, { volume: 0.5 }),
  playGameTransition: () => playSound(SOUNDS.click, { volume: 0.3 }),
};

// Common function to create confetti animation
export const createConfetti = (confettiRef, options = {}) => {
  if (!confettiRef.current) return;

  const defaults = {
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
  };

  confettiRef.current(Object.assign({}, defaults, options));
};

// Function to format large numbers with commas
export const formatNumber = (num, decimals = 2) => {
  if (num === undefined || num === null) return "0";

  // Convert to number if it's a string
  const numValue = typeof num === "string" ? parseFloat(num) : num;

  // Handle NaN
  if (isNaN(numValue)) return "0";

  // Format the number
  return numValue.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

// Function to calculate win probability based on game parameters
export const calculateWinProbability = (gameType, gameParams) => {
  switch (gameType) {
    case "mines":
      const { gridSize, minesCount } = gameParams;
      const totalCells = gridSize * gridSize;
      return ((totalCells - minesCount) / totalCells) * 100;

    case "roulette":
      const { betType } = gameParams;
      switch (betType) {
        case "red":
        case "black":
        case "odd":
        case "even":
        case "high":
        case "low":
          return (18 / 37) * 100; // European roulette with single zero
        case "dozen":
        case "column":
          return (12 / 37) * 100;
        case "street":
          return (3 / 37) * 100;
        case "corner":
          return (4 / 37) * 100;
        case "line":
          return (6 / 37) * 100;
        case "split":
          return (2 / 37) * 100;
        case "number":
          return (1 / 37) * 100;
        default:
          return 0;
      }

    case "wheel":
      const { segments, winningSegments } = gameParams;
      return (winningSegments / segments) * 100;

    default:
      return 0;
  }
};
