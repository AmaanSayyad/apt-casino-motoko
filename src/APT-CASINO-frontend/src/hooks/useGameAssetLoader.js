import { useEffect } from "react";
import { preloadMinesAssets } from "../app/game/mines/config/assets";
import { preloadRouletteAssets } from "../app/game/roulette/config/assets";
import { preloadWheelAssets } from "../app/game/wheel/components/assets";

/**
 * A hook that preloads game assets based on the current pathname
 * This helps optimize performance by loading assets when they might be needed
 */
export function useGameAssetLoader() {
  useEffect(() => {
    // Get the current pathname
    const pathname = window.location.pathname;

    // Preload assets based on pathname
    if (pathname.includes("/game/mines")) {
      console.log("📂 Preloading Mines game assets");
      preloadMinesAssets();
    } else if (pathname.includes("/game/roulette")) {
      console.log("📂 Preloading Roulette game assets");
      preloadRouletteAssets();
    } else if (pathname.includes("/game/wheel")) {
      console.log("📂 Preloading Wheel game assets");
      preloadWheelAssets();
    } else if (pathname === "/game" || pathname === "/") {
      // On the game lobby or home page, we preload minimal assets from each game
      // to make transitions smoother when a user selects a game
      console.log("📂 Preloading minimal game assets for lobby");

      // Use setTimeout to not block the main thread during initial page load
      setTimeout(() => {
        preloadMinesAssets();
        preloadRouletteAssets();
        preloadWheelAssets();
      }, 2000);
    }
  }, []);
}

export default useGameAssetLoader;
