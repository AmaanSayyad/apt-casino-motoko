// Streamlined Mines Game Component with Backend Integration
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaBomb,
  FaGem,
  FaPlay,
  FaDollarSign,
  FaCoins,
  FaGamepad,
  FaSyncAlt,
} from "react-icons/fa";
import { GiMining, GiDiamonds, GiMineExplosion } from "react-icons/gi";
import confetti from "canvas-confetti";
import { useNFID } from "../../providers/NFIDProvider";
import {
  createMinesActor,
  createAPTCTokenActor,
  CANISTER_IDS,
} from "../../config/aptc-config";
import { Principal } from "@dfinity/principal";
import { toast } from "react-toastify";
import { useLocalMinesGame } from "../../hooks/useLocalGameLogic";
import { parseTokenAmount } from "../../utils/gameLogic";

// Constants
const GRID_SIZE = 25; // 5x5 grid
const MIN_MINES = 1;
const MAX_MINES = 24;
const CONNECTION_CHECK_INTERVAL = 30000; // Check connection every 30 seconds
const APTC_DECIMALS = 8;
const INTERFACE_VERSION = Date.now(); // Cache busting timestamp

const StreamlinedMinesGame = ({
  betSettings = {},
  isWalletConnected = false,
  walletPrincipal = null,
}) => {
  const { isConnected, principal, identity } = useNFID();

  // Actors
  const [tokenActor, setTokenActor] = useState(null);

  // Use the local game logic hook instead of backend integration
  const {
    gameState: localGameState,
    gameLogic,
    startGame: startLocalGame,
    revealCell: revealLocalCell,
    cashOut: cashOutLocal,
    resetGame: resetLocalGame,
    refreshBalance,
    formatTokenAmount: formatLocalToken,
  } = useLocalMinesGame(tokenActor, principal);

  // UI state
  const [betAmount, setBetAmount] = useState(betSettings.betAmount || "1.0");
  const [mineCount, setMineCount] = useState(betSettings.mines || 5);
  const [gameGrid, setGameGrid] = useState(Array(GRID_SIZE).fill("hidden"));
  const [gamePhase, setGamePhase] = useState("setup"); // setup, playing, ended
  const [connectionError, setConnectionError] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [loading, setLoading] = useState(false); // For non-game operations

  // Function to initialize actors that can be called on demand
  const initializeActors = async () => {
    if (!isConnected) {
      console.log("⚠️ Wallet not connected, skipping actor initialization");
      toast.info("Wallet not connected - games will run in demo mode");
      return;
    }

    // Reset connection error state
    setConnectionError(false);
    // Show loading and reconnecting states during initialization
    setLoading(true);
    setReconnecting(true);

    // Clear any previous actors
    setTokenActor(null);

    try {
      console.log("🎮 Initializing Token actor for local game logic...");
      console.log("🔧 Interface regeneration timestamp:", Date.now()); // Debug timestamp

      // Try with identity first, if that fails try with null (anonymous)
      let tokenActorInstance;

      try {
        console.log("🔑 Attempting to create token actor with identity");
        tokenActorInstance = await createAPTCTokenActor(identity, 3); // Reduced retries
        console.log("✅ Successfully created token actor with identity");
      } catch (identityError) {
        console.warn(
          "⚠️ Failed to create token actor with identity:",
          identityError.message
        );

        // If it's a hash field error, it's definitely an interface mismatch
        if (identityError.message.includes("Cannot find field hash")) {
          throw new Error("INTERFACE_MISMATCH: " + identityError.message);
        }

        console.log("🔄 Trying to create anonymous token actor as fallback...");

        // Fall back to anonymous actors if identity fails
        try {
          tokenActorInstance = await createAPTCTokenActor(null, 3);
          toast.warning(
            "Connected in read-only mode. Games will run in demo mode."
          );
        } catch (anonError) {
          console.warn("Anonymous actor creation also failed:", anonError);
          toast.warning(
            "Token service unavailable - games will run in offline mode"
          );
          return; // Continue without token actor
        }
      }

      setTokenActor(tokenActorInstance);

      console.log("✅ Token actor initialized successfully for local game");

      // Test a simple call to verify the interface works (but don't fail if it doesn't)
      try {
        const balanceTest = await tokenActorInstance.icrc1_balance_of({
          owner: Principal.fromText(principal),
          subaccount: [],
        });
        console.log(
          "🔍 Interface test successful - balance check:",
          balanceTest
        );
        toast.success("Successfully connected to token service!");
      } catch (testError) {
        console.warn("⚠️ Interface test failed:", testError);
        toast.warning(
          "Token service connection unstable - proceeding with caution"
        );
      }
    } catch (err) {
      console.error("❌ Failed to initialize token actor:", err);

      // Handle interface mismatch specifically
      if (
        err.message.includes("INTERFACE_MISMATCH") ||
        err.message.includes("Cannot find field hash")
      ) {
        setConnectionError(true);
        toast.error(
          "🔄 Interface mismatch detected! Please use the 'Force Refresh Page' button below to clear browser cache and reload the latest game interface.",
          { autoClose: 10000 }
        );
      } else {
        // Don't show connection error for local games, just warn
        toast.warning(
          "Token service unavailable - games will run in offline mode"
        );
        console.warn("Continuing without token integration");
      }

      // Show more detailed error for debugging
      console.error("Detailed error:", err);
    } finally {
      // Always ensure loading and reconnecting are set to false when done
      setLoading(false);
      setReconnecting(false);
    }
  };

  // Initialize actors when wallet connects
  useEffect(() => {
    // Add a small delay before initialization to ensure proper wallet connection
    const initTimer = setTimeout(() => {
      initializeActors();
    }, 500);

    return () => clearTimeout(initTimer);
  }, [isConnected, identity]);

  // Clear any stuck state on initial mount
  useEffect(() => {
    // Reset local state on component mount
    setGameGrid(Array(GRID_SIZE).fill("hidden"));
    setGamePhase("setup");
    setConnectionError(false);
  }, []);

  // Update game grid based on local game state
  useEffect(() => {
    if (localGameState.activeGame) {
      updateGridFromLocalGame(localGameState.activeGame);

      // Set game phase based on local game state
      if (localGameState.activeGame.gameState === "playing") {
        setGamePhase("playing");
      } else if (
        ["won", "lost", "cashed"].includes(localGameState.activeGame.gameState)
      ) {
        setGamePhase("ended");
      } else {
        setGamePhase("setup");
      }
    } else {
      setGameGrid(Array(GRID_SIZE).fill("hidden"));
      setGamePhase("setup");
    }
  }, [localGameState.activeGame]);

  // Update grid from local game state
  const updateGridFromLocalGame = useCallback((gameData) => {
    if (!gameData) return;

    const newGrid = Array(GRID_SIZE).fill("hidden");

    // Mark revealed cells as safe
    if (gameData.revealedCells) {
      gameData.revealedCells.forEach((cellIndex) => {
        if (cellIndex >= 0 && cellIndex < GRID_SIZE) {
          newGrid[cellIndex] = "safe";
        }
      });
    }

    // Show mines if game is over
    if (
      ["won", "lost", "cashed"].includes(gameData.gameState) &&
      gameData.minePositions
    ) {
      gameData.minePositions.forEach((mineIndex) => {
        if (mineIndex >= 0 && mineIndex < GRID_SIZE) {
          newGrid[mineIndex] = "mine";
        }
      });
    }

    setGameGrid(newGrid);
  }, []);

  // Start new game
  const startGame = useCallback(async () => {
    if (!tokenActor || !principal) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (
      localGameState.activeGame &&
      localGameState.activeGame.gameState === "playing"
    ) {
      toast.warning("You already have an active game");
      return;
    }

    try {
      setLoading(true);
      const newGame = await startLocalGame(betAmount, mineCount);
      console.log("🎮 Local game started:", newGame);
    } catch (err) {
      console.error("❌ Failed to start game:", err);
      toast.error(err.message || "Failed to start game");
    } finally {
      setLoading(false);
    }
  }, [
    tokenActor,
    principal,
    localGameState.activeGame,
    startLocalGame,
    betAmount,
    mineCount,
  ]);

  // Reveal cell
  const revealCell = useCallback(
    async (cellIndex) => {
      if (
        !localGameState.activeGame ||
        localGameState.activeGame.gameState !== "playing"
      ) {
        return;
      }

      if (gameGrid[cellIndex] !== "hidden") {
        return; // Cell already revealed
      }

      try {
        setLoading(true);
        const result = await revealLocalCell(cellIndex);
        console.log("🔍 Cell revealed:", result);

        // Add visual effects
        if (result.result === "mine") {
          // Dramatic mine explosion effect
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ["#ff0000", "#ff6b35"],
          });
        } else if (result.result === "auto_win") {
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
          });
        }
      } catch (err) {
        console.error("❌ Failed to reveal cell:", err);
        toast.error(err.message || "Failed to reveal cell");
      } finally {
        setLoading(false);
      }
    },
    [localGameState.activeGame, gameGrid, revealLocalCell]
  );

  // Cash out
  const cashOut = useCallback(async () => {
    if (
      !localGameState.activeGame ||
      localGameState.activeGame.gameState !== "playing"
    ) {
      return;
    }

    try {
      setLoading(true);
      const result = await cashOutLocal();
      console.log("💰 Cashed out:", result);

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (err) {
      console.error("❌ Failed to cash out:", err);
      toast.error(err.message || "Failed to cash out");
    } finally {
      setLoading(false);
    }
  }, [localGameState.activeGame, cashOutLocal]);

  // Reset game
  const resetGame = useCallback(() => {
    resetLocalGame();
  }, [resetLocalGame]);

  // Helper function to check connection status
  const checkConnection = useCallback(async () => {
    if (!tokenActor) return;

    try {
      // Try a simple query to see if the connection is still alive
      console.log("🔍 Checking connection status...");
      await tokenActor.icrc1_balance_of({
        owner: Principal.fromText(principal),
        subaccount: [],
      });

      // If we get here, connection is good
      if (connectionError) {
        console.log("✅ Connection restored!");
        setConnectionError(false);
        toast.success("Connection restored!");
      }
    } catch (err) {
      console.error("❌ Connection check failed:", err);

      // Only show error if this is a new failure
      if (!connectionError) {
        setConnectionError(true);
        toast.error("Connection to token service lost. Please reconnect.");
      }
    }
  }, [tokenActor, connectionError, principal]);

  // Set up periodic connection checking
  useEffect(() => {
    // Only check connection if we have token actor
    if (!tokenActor) return;

    console.log("⏱️ Setting up connection monitoring...");

    // Check immediately on first setup
    checkConnection();

    // Then set up interval
    const intervalId = setInterval(() => {
      checkConnection();
    }, CONNECTION_CHECK_INTERVAL);

    // Clean up on unmount
    return () => {
      clearInterval(intervalId);
    };
  }, [tokenActor, checkConnection]);

  // Refresh balance when token actor is ready
  useEffect(() => {
    if (tokenActor && principal) {
      refreshBalance();
    }
  }, [tokenActor, principal, refreshBalance]); // Render cell
  const renderCell = (index) => {
    const cellState = gameGrid[index];
    const isRevealed = cellState !== "hidden";
    const isMine = cellState === "mine";
    const isSafe = cellState === "safe";

    return (
      <motion.button
        key={index}
        onClick={() => revealCell(index)}
        disabled={
          localGameState.loading ||
          loading ||
          isRevealed ||
          gamePhase !== "playing"
        }
        whileHover={{ scale: isRevealed ? 1 : 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`
          w-12 h-12 md:w-14 md:h-14 rounded-lg border-2 transition-all duration-200 font-bold text-lg
          ${
            isRevealed
              ? isMine
                ? "bg-red-600 border-red-500 text-white"
                : "bg-green-600 border-green-500 text-white"
              : "bg-gray-800 border-gray-600 text-gray-400 hover:border-yellow-500 hover:bg-gray-700"
          }
          ${
            localGameState.loading || loading || gamePhase !== "playing"
              ? "cursor-not-allowed opacity-50"
              : "cursor-pointer"
          }
        `}
      >
        {isMine && <FaBomb />}
        {isSafe && <FaGem />}
        {!isRevealed && "?"}
      </motion.button>
    );
  };

  if (!isConnected) {
    return (
      <div className="text-center p-8">
        <h3 className="text-xl font-bold text-white mb-4">Welcome to Mines</h3>
        <p className="text-white/70 mb-4">
          Connect your wallet for full functionality, or play in demo mode
        </p>
        <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-4 mb-4">
          <h4 className="text-blue-300 font-semibold mb-2">Game Modes:</h4>
          <ul className="text-blue-200 text-sm space-y-1 text-left">
            <li>
              🟢 <strong>Live Mode:</strong> Real APTC tokens, wallet connected
            </li>
            <li>
              🟡 <strong>Demo Mode:</strong> Simulated gameplay, wallet
              connected but service unavailable
            </li>
            <li>
              ⚫ <strong>Offline Mode:</strong> Full offline gameplay, no wallet
              needed
            </li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      {/* Debug Info Banner - Remove in production */}
      <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-2 mb-4 text-xs">
        <span className="text-blue-300">
          Interface Version: {INTERFACE_VERSION}
        </span>
        <span className="text-blue-300 ml-4">
          Connected: {isConnected ? "✅" : "❌"}
        </span>
        <span className="text-blue-300 ml-4">
          Actors: {tokenActor ? "✅" : "❌"}
        </span>
        <span className="text-blue-300 ml-4">
          Game State: {localGameState.activeGame?.gameState || "setup"}
        </span>
      </div>

      {/* Connection Error Banner */}
      {connectionError && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg p-4 mb-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <h3 className="text-red-300 font-bold mb-1">
                🔄 Interface Mismatch or Connection Issue Detected
              </h3>
              <p className="text-red-200/70">
                This issue occurs when the game interface is outdated. Common
                causes:
              </p>
              <ul className="text-red-200/70 list-disc list-inside text-sm mt-2 mb-3 text-left">
                <li>Browser cache contains old interface files</li>
                <li>The game server was recently updated</li>
                <li>Your browser is blocking the connection</li>
              </ul>
              <p className="text-yellow-300 font-semibold text-sm">
                💡 Recommended: Use "Force Refresh Page" to clear all cached
                data!
              </p>
            </div>

            <div className="flex flex-col gap-2 w-full md:w-auto">
              <button
                onClick={() => {
                  toast.info("🔄 Refreshing page to clear all cache...");
                  setTimeout(() => window.location.reload(), 1000);
                }}
                className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 w-full md:w-auto"
              >
                🔄 Force Refresh Page
              </button>

              <button
                onClick={() => {
                  toast.info("Attempting to reconnect to game server...");
                  initializeActors();
                }}
                disabled={reconnecting}
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 w-full md:w-auto text-sm"
              >
                {reconnecting ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Reconnecting...</span>
                  </>
                ) : (
                  <>
                    <FaSyncAlt className="animate-pulse" />
                    <span>Try Reconnect</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Controls */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <FaCoins className="text-yellow-500" />
              <span className="text-white/70">Balance:</span>
              <span className="text-white font-bold">
                {formatLocalToken(localGameState.balance)} APTC
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <div
              className={`px-3 py-1 rounded-full ${
                {
                  setup: "bg-blue-600/20 text-blue-400",
                  playing: "bg-green-600/20 text-green-400",
                  ended: "bg-red-600/20 text-red-400",
                }[gamePhase]
              }`}
            >
              {gamePhase === "setup" && "Ready to Play"}
              {gamePhase === "playing" && "Game in Progress"}
              {gamePhase === "ended" && "Game Ended"}
            </div>

            {/* Show game mode indicator */}
            {localGameState.activeGame && (
              <div
                className={`px-2 py-1 rounded text-xs ${
                  localGameState.activeGame.offlineMode
                    ? "bg-gray-600/20 text-gray-400"
                    : localGameState.activeGame.demoMode
                    ? "bg-yellow-600/20 text-yellow-400"
                    : "bg-green-600/20 text-green-400"
                }`}
              >
                {localGameState.activeGame.offlineMode
                  ? "Offline"
                  : localGameState.activeGame.demoMode
                  ? "Demo"
                  : "Live"}
              </div>
            )}
          </div>
        </div>

        {gamePhase === "setup" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-white/70 text-sm mb-2">
                Bet Amount (APTC)
              </label>
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                disabled={loading}
                min="0.01"
                step="0.01"
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-yellow-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-white/70 text-sm mb-2">
                Number of Mines
              </label>
              <input
                type="number"
                value={mineCount}
                onChange={(e) => setMineCount(parseInt(e.target.value) || 1)}
                disabled={loading}
                min={MIN_MINES}
                max={MAX_MINES}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-yellow-500 focus:outline-none"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={startGame}
                disabled={localGameState.loading || loading}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <FaPlay />
                {localGameState.loading || loading
                  ? "Starting..."
                  : "Start Game"}
              </button>
            </div>
          </div>
        )}

        {gamePhase === "playing" && localGameState.activeGame && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-gray-800/50 rounded-lg p-3 text-center">
              <div className="text-white/70 text-sm">Bet</div>
              <div className="text-white font-bold">
                {localGameState.activeGame.betAmountFormatted ||
                  localGameState.activeGame.betAmount}{" "}
                APTC
              </div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3 text-center">
              <div className="text-white/70 text-sm">Mines</div>
              <div className="text-white font-bold">
                {localGameState.activeGame.mineCount || 0}
              </div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3 text-center">
              <div className="text-white/70 text-sm">Multiplier</div>
              <div className="text-green-400 font-bold">
                {localGameState.activeGame.multiplier
                  ? Number(localGameState.activeGame.multiplier).toFixed(2)
                  : "1.00"}
                x
              </div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3 text-center">
              <button
                onClick={cashOut}
                disabled={localGameState.loading || loading}
                className="bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white font-bold py-1 px-3 rounded transition-all duration-200 flex items-center justify-center gap-1 text-sm disabled:opacity-50"
              >
                <FaDollarSign />
                Cash Out
              </button>
            </div>
          </div>
        )}

        {gamePhase === "ended" && (
          <div className="text-center mb-4">
            <button
              onClick={resetGame}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-2 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 mx-auto"
            >
              <FaGamepad />
              Play Again
            </button>
          </div>
        )}
      </div>

      {/* Game Grid */}
      <div className="flex justify-center">
        <div className="grid grid-cols-5 gap-2 p-4 bg-gray-900/50 rounded-xl border border-gray-700">
          {Array.from({ length: GRID_SIZE }, (_, index) => renderCell(index))}
        </div>
      </div>

      {gamePhase === "setup" && (
        <div className="text-center mt-6">
          <p className="text-white/60">
            Configure your bet and mines, then start playing!
          </p>
        </div>
      )}

      {gamePhase === "playing" && (
        <div className="text-center mt-6">
          <p className="text-white/60">
            Click on tiles to reveal. Find gems and avoid mines!
          </p>
          {gamePhase === "playing" && localGameState.activeGame && (
            <p className="text-green-400 font-bold mt-2">
              Potential Win:{" "}
              {localGameState.activeGame.potentialWin
                ? formatLocalToken(
                    parseTokenAmount(
                      localGameState.activeGame.potentialWin.toString()
                    )
                  )
                : "0.00"}{" "}
              APTC
            </p>
          )}
        </div>
      )}

      {/* Debug tools section - Only visible when there are issues */}
      {connectionError && (
        <div className="mt-8 border-t border-gray-700 pt-4">
          <div className="flex flex-col space-y-2">
            <p className="text-xs text-gray-400 mb-2">
              Local game troubleshooting tools:
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={resetGame}
                disabled={loading}
                className="bg-purple-900 hover:bg-purple-800 text-white text-xs py-1 px-3 rounded-md transition-all duration-200"
              >
                🛠️ Reset Local Game
              </button>
              <button
                onClick={initializeActors}
                disabled={reconnecting}
                className="bg-blue-900 hover:bg-blue-800 text-white text-xs py-1 px-3 rounded-md transition-all duration-200"
              >
                🔄 Reinitialize Connection
              </button>
              <button
                onClick={() => {
                  resetGame();
                  refreshBalance();
                  toast.success("Game state refreshed!");
                }}
                disabled={loading}
                className="bg-red-900 hover:bg-red-800 text-white text-xs py-1 px-3 rounded-md transition-all duration-200"
              >
                ⚡ Refresh All
              </button>
              <button
                onClick={() => {
                  toast.info("Refreshing page to reload interfaces...");
                  setTimeout(() => window.location.reload(), 1000);
                }}
                className="bg-orange-900 hover:bg-orange-800 text-white text-xs py-1 px-3 rounded-md transition-all duration-200"
              >
                🔄 Force Refresh Page
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Use these tools if you're experiencing issues with the local game.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StreamlinedMinesGame;
