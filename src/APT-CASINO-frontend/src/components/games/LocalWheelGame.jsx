// Local Wheel Game Component with ICP Integration
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaPlay, FaCoins, FaSyncAlt, FaDollarSign } from "react-icons/fa";
import { GiRoulette } from "react-icons/gi";
import confetti from "canvas-confetti";
import { useNFID } from "../../providers/NFIDProvider";
import { createAPTCTokenActor } from "../../config/aptc-config";
import { Principal } from "@dfinity/principal";
import { toast } from "react-toastify";
import { useLocalWheelGame } from "../../hooks/useLocalGameLogic";
import { parseTokenAmount } from "../../utils/gameLogic";

// Constants
const CONNECTION_CHECK_INTERVAL = 30000;
const INTERFACE_VERSION = Date.now();

const LocalWheelGame = ({
  betSettings = {},
  isWalletConnected = false,
  walletPrincipal = null,
}) => {
  const { isConnected, principal, identity } = useNFID();

  // Actors
  const [tokenActor, setTokenActor] = useState(null);

  // Use the local wheel game logic hook
  const {
    gameState: localGameState,
    gameLogic,
    startSpin: startLocalSpin,
    completeSpin: completeLocalSpin,
    resetGame: resetLocalGame,
    refreshBalance,
    getWheelSegments,
    getResultPosition,
    formatTokenAmount: formatLocalToken,
  } = useLocalWheelGame(tokenActor, principal);

  // UI state
  const [betAmount, setBetAmount] = useState(betSettings.betAmount || "1.0");
  const [selectedMultiplier, setSelectedMultiplier] = useState(
    betSettings.multiplier || 2
  );
  const [wheelRotation, setWheelRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [loading, setLoading] = useState(false);

  // Available multipliers for betting
  const availableMultipliers = [2, 3, 5, 10, 50];

  // Initialize token actor
  const initializeActors = async () => {
    if (!isConnected) {
      console.log("⚠️ Wallet not connected, skipping actor initialization");
      toast.info("Wallet not connected - wheel game will run in demo mode");
      return;
    }

    setConnectionError(false);
    setLoading(true);
    setReconnecting(true);
    setTokenActor(null);

    try {
      console.log("🎰 Initializing Token actor for local wheel game...");

      let tokenActorInstance;

      try {
        console.log("🔑 Attempting to create token actor with identity");
        tokenActorInstance = await createAPTCTokenActor(identity, 3);
        console.log("✅ Successfully created token actor with identity");
      } catch (identityError) {
        console.warn(
          "⚠️ Failed to create token actor with identity:",
          identityError.message
        );

        if (identityError.message.includes("Cannot find field hash")) {
          throw new Error("INTERFACE_MISMATCH: " + identityError.message);
        }

        console.log("🔄 Trying to create anonymous token actor as fallback...");
        try {
          tokenActorInstance = await createAPTCTokenActor(null, 3);
          toast.warning(
            "Connected in read-only mode. Wheel game will run in demo mode."
          );
        } catch (anonError) {
          console.warn("Anonymous actor creation also failed:", anonError);
          toast.warning(
            "Token service unavailable - wheel will run in offline mode"
          );
          return;
        }
      }

      setTokenActor(tokenActorInstance);

      // Test connection
      try {
        const balanceTest = await tokenActorInstance.icrc1_balance_of({
          owner: Principal.fromText(principal),
          subaccount: [],
        });
        console.log(
          "🔍 Interface test successful - balance check:",
          balanceTest
        );
      } catch (testError) {
        console.warn("⚠️ Interface test failed:", testError);
        if (testError.message.includes("Cannot find field hash")) {
          throw new Error("INTERFACE_MISMATCH: " + testError.message);
        }
        throw new Error("Interface communication failed after initialization");
      }

      toast.success("Successfully connected to token service!");
    } catch (err) {
      console.error("❌ Failed to initialize token actor:", err);

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
        toast.error(
          "Failed to connect to the token service. Please try reconnecting."
        );
        setConnectionError(true);
      }

      console.error("Detailed error:", err);
    } finally {
      setLoading(false);
      setReconnecting(false);
    }
  };

  // Initialize actors when wallet connects
  useEffect(() => {
    const initTimer = setTimeout(() => {
      initializeActors();
    }, 500);

    return () => clearTimeout(initTimer);
  }, [isConnected, identity]);

  // Connection monitoring
  const checkConnection = useCallback(async () => {
    if (!tokenActor) return;

    try {
      console.log("🔍 Checking connection status...");
      await tokenActor.icrc1_balance_of({
        owner: Principal.fromText(principal),
        subaccount: [],
      });

      if (connectionError) {
        console.log("✅ Connection restored!");
        setConnectionError(false);
        toast.success("Connection restored!");
      }
    } catch (err) {
      console.error("❌ Connection check failed:", err);

      if (!connectionError) {
        setConnectionError(true);
        toast.error("Connection to token service lost. Please reconnect.");
      }
    }
  }, [tokenActor, connectionError, principal]);

  useEffect(() => {
    if (!tokenActor) return;

    console.log("⏱️ Setting up connection monitoring...");
    checkConnection();

    const intervalId = setInterval(() => {
      checkConnection();
    }, CONNECTION_CHECK_INTERVAL);

    return () => {
      clearInterval(intervalId);
    };
  }, [tokenActor, checkConnection]);

  // Refresh balance when token actor is ready
  useEffect(() => {
    if (tokenActor && principal) {
      refreshBalance();
    }
  }, [tokenActor, principal, refreshBalance]);

  // Start spin
  const startSpin = useCallback(async () => {
    if (!tokenActor || !principal) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (
      localGameState.activeGame &&
      localGameState.activeGame.gameState === "spinning"
    ) {
      toast.warning("Wheel is already spinning");
      return;
    }

    try {
      setLoading(true);
      setIsSpinning(true);

      // Start the local spin
      const spinData = await startLocalSpin(betAmount, selectedMultiplier);
      console.log("🎰 Local wheel spin started:", spinData);

      // Calculate final wheel position
      const baseRotations = 5; // Number of full rotations
      const resultPosition = getResultPosition();
      const finalRotation =
        wheelRotation + baseRotations * 360 + resultPosition;

      // Animate the wheel
      setWheelRotation(finalRotation);

      // Wait for spin animation to complete then show result
      setTimeout(async () => {
        try {
          await completeLocalSpin();
          setIsSpinning(false);
        } catch (err) {
          console.error("❌ Failed to complete spin:", err);
          toast.error(err.message || "Failed to complete spin");
          setIsSpinning(false);
        }
      }, spinData.spinDuration || 3000);
    } catch (err) {
      console.error("❌ Failed to start spin:", err);
      toast.error(err.message || "Failed to start spin");
      setIsSpinning(false);
    } finally {
      setLoading(false);
    }
  }, [
    tokenActor,
    principal,
    localGameState.activeGame,
    startLocalSpin,
    betAmount,
    selectedMultiplier,
    wheelRotation,
    getResultPosition,
    completeLocalSpin,
  ]);

  // Reset game
  const resetGame = useCallback(() => {
    resetLocalGame();
    setWheelRotation(0);
    setIsSpinning(false);
  }, [resetLocalGame]);

  // Render wheel segments
  const renderWheelSegments = () => {
    const segments = getWheelSegments();
    const segmentAngle = 360 / segments.length;

    return segments.map((segment, index) => {
      const rotation = index * segmentAngle;
      return (
        <div
          key={index}
          className="absolute w-full h-full"
          style={{
            transform: `rotate(${rotation}deg)`,
            clipPath: `polygon(50% 50%, 50% 0%, ${
              50 + 50 * Math.cos((segmentAngle * Math.PI) / 180)
            }% ${50 - 50 * Math.sin((segmentAngle * Math.PI) / 180)}%)`,
            backgroundColor: segment.color,
          }}
        >
          <div
            className="absolute text-white font-bold text-sm"
            style={{
              top: "15%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          >
            {segment.multiplier}x
          </div>
        </div>
      );
    });
  };

  if (!isConnected) {
    return (
      <div className="text-center p-8">
        <h3 className="text-xl font-bold text-white mb-4">Welcome to Wheel</h3>
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
      {/* Debug Info Banner */}
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
                  toast.info("Attempting to reconnect to token service...");
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
                localGameState.activeGame?.gameState === "spinning"
                  ? "bg-yellow-600/20 text-yellow-400"
                  : localGameState.activeGame?.gameState === "completed"
                  ? "bg-green-600/20 text-green-400"
                  : "bg-blue-600/20 text-blue-400"
              }`}
            >
              {localGameState.activeGame?.gameState === "spinning" &&
                "Spinning..."}
              {localGameState.activeGame?.gameState === "completed" &&
                "Spin Complete"}
              {(!localGameState.activeGame ||
                localGameState.activeGame?.gameState === "setup") &&
                "Ready to Spin"}
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

        {/* Betting Controls */}
        {(!localGameState.activeGame ||
          localGameState.activeGame.gameState !== "spinning") && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-white/70 text-sm mb-2">
                Bet Amount (APTC)
              </label>
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                disabled={loading || isSpinning}
                min="0.01"
                step="0.01"
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-yellow-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-white/70 text-sm mb-2">
                Multiplier Bet
              </label>
              <select
                value={selectedMultiplier}
                onChange={(e) =>
                  setSelectedMultiplier(parseInt(e.target.value))
                }
                disabled={loading || isSpinning}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-yellow-500 focus:outline-none"
              >
                {availableMultipliers.map((mult) => (
                  <option key={mult} value={mult}>
                    {mult}x Multiplier
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={startSpin}
                disabled={localGameState.loading || loading || isSpinning}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <GiRoulette />
                {localGameState.loading || loading || isSpinning
                  ? "Spinning..."
                  : "Spin Wheel"}
              </button>
            </div>
          </div>
        )}

        {/* Game Info */}
        {localGameState.activeGame && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800/50 rounded-lg p-3 text-center">
              <div className="text-white/70 text-sm">Bet</div>
              <div className="text-white font-bold">
                {localGameState.activeGame.betAmountFormatted ||
                  localGameState.activeGame.betAmount}{" "}
                APTC
              </div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3 text-center">
              <div className="text-white/70 text-sm">Multiplier</div>
              <div className="text-white font-bold">
                {localGameState.activeGame.selectedMultiplier}x
              </div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3 text-center">
              <div className="text-white/70 text-sm">Result</div>
              <div className="text-white font-bold">
                {localGameState.activeGame.result
                  ? `${localGameState.activeGame.result.multiplier}x`
                  : "---"}
              </div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3 text-center">
              <div className="text-white/70 text-sm">Win Amount</div>
              <div
                className={`font-bold ${
                  localGameState.activeGame.winAmount > 0
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {localGameState.activeGame.winAmount > 0
                  ? `${formatLocalToken(
                      parseTokenAmount(
                        localGameState.activeGame.winAmount.toString()
                      )
                    )} APTC`
                  : "0.00 APTC"}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Wheel Display */}
      <div className="flex justify-center mb-6">
        <div className="relative">
          {/* Wheel Container */}
          <div className="relative w-80 h-80 rounded-full border-4 border-yellow-500 overflow-hidden">
            <motion.div
              className="w-full h-full relative"
              animate={{ rotate: wheelRotation }}
              transition={{
                duration: isSpinning ? 3 : 0,
                ease: isSpinning ? "easeOut" : "linear",
              }}
            >
              {renderWheelSegments()}
            </motion.div>
          </div>

          {/* Pointer */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2">
            <div className="w-0 h-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-yellow-500"></div>
          </div>

          {/* Center Circle */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-yellow-500 rounded-full border-2 border-white"></div>
        </div>
      </div>

      {/* Game Result */}
      {localGameState.activeGame &&
        localGameState.activeGame.gameState === "completed" && (
          <div className="text-center mb-6">
            <div
              className={`text-2xl font-bold mb-2 ${
                localGameState.activeGame.winAmount > 0
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {localGameState.activeGame.winAmount > 0
                ? "🎉 You Won!"
                : "😔 Better Luck Next Time!"}
            </div>
            <div className="text-white/70 mb-4">
              Wheel landed on:{" "}
              <span className="font-bold text-white">
                {localGameState.activeGame.result?.multiplier}x
              </span>
            </div>
            <button
              onClick={resetGame}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-2 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 mx-auto"
            >
              <FaPlay />
              Spin Again
            </button>
          </div>
        )}

      {/* Instructions */}
      {(!localGameState.activeGame ||
        localGameState.activeGame.gameState === "setup") && (
        <div className="text-center mt-6">
          <p className="text-white/60">
            Choose your bet amount and multiplier, then spin the wheel!
          </p>
          <p className="text-white/40 text-sm mt-2">
            Win if the wheel lands on your selected multiplier or higher.
          </p>
        </div>
      )}

      {/* Debug tools section */}
      {connectionError && (
        <div className="mt-8 border-t border-gray-700 pt-4">
          <div className="flex flex-col space-y-2">
            <p className="text-xs text-gray-400 mb-2">
              Local wheel game troubleshooting tools:
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
              Use these tools if you're experiencing issues with the local wheel
              game.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocalWheelGame;
