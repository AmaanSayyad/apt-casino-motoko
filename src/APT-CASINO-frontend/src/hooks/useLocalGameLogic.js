// Hook for Local Game Logic with ICP Integration
import { useState, useCallback, useEffect } from "react";
import { Principal } from "@dfinity/principal";
import { toast } from "react-toastify";
import {
  MinesGameLogic,
  WheelGameLogic,
  GameSessionManager,
  formatTokenAmount,
  parseTokenAmount,
} from "../utils/gameLogic";

export const useLocalMinesGame = (tokenActor, userPrincipal) => {
  const [gameLogic] = useState(() => new MinesGameLogic());
  const [sessionManager, setSessionManager] = useState(null);
  const [gameState, setGameState] = useState({
    activeGame: null,
    balance: 0n,
    loading: false,
    error: null,
  });

  // Initialize session manager when token actor is available
  useEffect(() => {
    if (tokenActor && userPrincipal) {
      setSessionManager(new GameSessionManager(tokenActor, userPrincipal));
    }
  }, [tokenActor, userPrincipal]);

  // Refresh balance
  const refreshBalance = useCallback(async () => {
    if (!sessionManager) return 0n;

    try {
      const balance = await sessionManager.getBalance();
      setGameState((prev) => ({ ...prev, balance }));
      return balance;
    } catch (error) {
      console.error("Failed to refresh balance:", error);
      // Don't show toast error for balance refresh failures in local games
      console.warn("Balance fetch failed, using cached/default value");
      return 0n;
    }
  }, [sessionManager]);

  // Start new game
  const startGame = useCallback(
    async (betAmount, mineCount) => {
      setGameState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        // For local games, we can start the game even without ICP connection
        // but we'll warn the user about limited functionality
        if (!sessionManager) {
          console.warn("No session manager - starting game in offline mode");

          // Start local game without ICP integration
          const gameData = gameLogic.startGame(
            parseFloat(betAmount),
            parseInt(mineCount)
          );

          setGameState((prev) => ({
            ...prev,
            activeGame: {
              ...gameData,
              betAmountFormatted: betAmount,
              transactionId: `offline-${Date.now()}`,
              offlineMode: true,
            },
            loading: false,
          }));

          toast.warning("Started game in offline mode - no token transactions");
          return gameData;
        }

        // Try to check balance and place bet if connected
        try {
          const hasBalance = await sessionManager.checkBalance(betAmount);
          if (!hasBalance) {
            throw new Error("Insufficient balance");
          }

          // Place bet on blockchain
          const betResult = await sessionManager.placeBet(betAmount);
          if (!betResult.success) {
            throw new Error("Failed to place bet");
          }

          // Start local game
          const gameData = gameLogic.startGame(
            parseFloat(betAmount),
            parseInt(mineCount)
          );

          setGameState((prev) => ({
            ...prev,
            activeGame: {
              ...gameData,
              betAmountFormatted: betAmount,
              transactionId: betResult.transactionId,
            },
            loading: false,
          }));

          // Refresh balance to show updated amount
          const newBalance = await refreshBalance();

          // Show success message with mode and updated balance
          const balanceFormatted = formatTokenAmount(newBalance);
          toast.success(
            `Game started in ${
              betResult.mode || "live"
            } mode! Bet: ${betAmount} APTC. Balance: ${balanceFormatted}`
          );

          console.log(
            `🎮 Game started with bet of ${betAmount} APTC. Transaction: ${betResult.transactionId}`
          );
          return gameData;
        } catch (icpError) {
          console.warn(
            "ICP integration failed, starting in demo mode:",
            icpError
          );

          // Start game in demo mode
          const gameData = gameLogic.startGame(
            parseFloat(betAmount),
            parseInt(mineCount)
          );

          setGameState((prev) => ({
            ...prev,
            activeGame: {
              ...gameData,
              betAmountFormatted: betAmount,
              transactionId: `demo-${Date.now()}`,
              demoMode: true,
            },
            loading: false,
          }));

          toast.info("Started game in demo mode - ICP connection unavailable");
          return gameData;
        }
      } catch (error) {
        setGameState((prev) => ({
          ...prev,
          loading: false,
          error: error.message,
        }));
        throw error;
      }
    },
    [sessionManager, gameLogic, refreshBalance]
  );

  // Reveal cell
  const revealCell = useCallback(
    async (cellIndex) => {
      if (!gameState.activeGame || gameLogic.gameState !== "playing") {
        throw new Error("No active game");
      }

      setGameState((prev) => ({ ...prev, loading: true }));

      try {
        const result = gameLogic.revealCell(cellIndex);

        // Update game state
        setGameState((prev) => ({
          ...prev,
          activeGame: {
            ...prev.activeGame,
            ...result,
            gameState: result.gameState,
          },
          loading: false,
        }));

        // Handle game end scenarios
        if (result.result === "mine") {
          toast.error("💥 BOOM! You hit a mine!");
          // No winnings to process
        } else if (result.result === "auto_win") {
          // Process winnings for auto-win only if not in demo/offline mode
          if (
            !gameState.activeGame.offlineMode &&
            !gameState.activeGame.demoMode &&
            sessionManager
          ) {
            try {
              await sessionManager.processWinnings(result.potentialWin);
              await refreshBalance();
              toast.success(
                `🎉 Congratulations! You won ${formatTokenAmount(
                  parseTokenAmount(result.potentialWin.toString())
                )} APTC!`
              );
            } catch (winningsError) {
              console.error("Error processing auto-win:", winningsError);
              toast.warning(
                "Auto-win detected but winnings processing failed. Try cashing out manually."
              );
            }
          } else {
            // Demo/offline mode auto-win
            const mode = gameState.activeGame.offlineMode ? "offline" : "demo";
            toast.success(
              `🎉 Auto-win in ${mode} mode! Simulated win: ${formatTokenAmount(
                parseTokenAmount(result.potentialWin.toString())
              )} APTC!`
            );
          }
        } else {
          toast.success(
            `💎 Safe! Multiplier: ${result.multiplier.toFixed(2)}x`
          );
        }

        return result;
      } catch (error) {
        setGameState((prev) => ({ ...prev, loading: false }));
        throw error;
      }
    },
    [gameState.activeGame, gameLogic, sessionManager, refreshBalance]
  );

  // Cash out
  const cashOut = useCallback(async () => {
    // Allow cashout for both "playing" and "finished" games
    if (
      !gameState.activeGame ||
      (gameLogic.gameState !== "playing" && gameLogic.gameState !== "finished")
    ) {
      throw new Error("No active game to cash out");
    }

    setGameState((prev) => ({ ...prev, loading: true }));

    try {
      const result = gameLogic.cashOut();

      // Handle different game modes
      if (gameState.activeGame.offlineMode || gameState.activeGame.demoMode) {
        // In offline/demo mode, just simulate the cashout
        setGameState((prev) => ({
          ...prev,
          activeGame: {
            ...prev.activeGame,
            ...result,
          },
          loading: false,
        }));

        const mode = gameState.activeGame.offlineMode ? "offline" : "demo";
        toast.success(
          `💰 Cashed out in ${mode} mode! Simulated win: ${formatTokenAmount(
            parseTokenAmount(result.winAmount.toString())
          )} APTC!`
        );
        return result;
      }

      // Normal mode with ICP integration
      if (sessionManager && result.winAmount > 0) {
        try {
          console.log(`💰 Processing winnings of ${result.winAmount}...`);

          // Actually process winnings through ICP
          const winResult = await sessionManager.processWinnings(
            result.winAmount
          );

          // Get updated balance after winnings processed
          const newBalance = await refreshBalance();

          // Update game state with transaction info
          setGameState((prev) => ({
            ...prev,
            activeGame: {
              ...prev.activeGame,
              ...result,
              winTransactionId: winResult.transactionId,
              winProcessedMode: winResult.mode,
            },
            loading: false,
            balance: newBalance,
          }));

          const formattedBalance = formatTokenAmount(newBalance);

          // Show appropriate message based on processing mode
          if (winResult.mode === "live") {
            toast.success(
              `💰 Cashed out! You won ${formatTokenAmount(
                parseTokenAmount(result.winAmount.toString())
              )} APTC! Balance: ${formattedBalance}`
            );
            console.log(
              `✅ Winnings processed with transaction: ${winResult.transactionId}`
            );
          } else {
            toast.info(
              `💰 Cashed out in ${
                winResult.mode
              } mode! Winnings: ${formatTokenAmount(
                parseTokenAmount(result.winAmount.toString())
              )} APTC! Balance: ${formattedBalance}`
            );
            console.log(`ℹ️ Winnings processed in ${winResult.mode} mode`);
          }

          return result;
        } catch (winningsError) {
          console.error("Error processing winnings:", winningsError);
          toast.warning(
            "Cashout calculated but winnings processing failed. Please try again."
          );

          // Still update game state but mark as failed
          setGameState((prev) => ({
            ...prev,
            activeGame: {
              ...prev.activeGame,
              ...result,
              winningsFailed: true,
            },
            loading: false,
          }));
        }
      } else {
        // No winnings or no session manager
        setGameState((prev) => ({
          ...prev,
          activeGame: {
            ...prev.activeGame,
            ...result,
          },
          loading: false,
        }));

        if (result.winAmount <= 0) {
          toast.info("Game ended with no winnings.");
        } else {
          toast.success(
            `💰 Cashed out! You won ${formatTokenAmount(
              parseTokenAmount(result.winAmount.toString())
            )} APTC!`
          );
        }
      }
      return result;
    } catch (error) {
      console.error("Cashout error:", error);

      // Give helpful error message with recovery options
      toast.error(
        `Cashout failed: ${error.message}. Try refreshing your balance first.`,
        { autoClose: 7000 }
      );

      // Still mark game as finished with error state
      setGameState((prev) => ({
        ...prev,
        loading: false,
        error: error.message,
        activeGame: prev.activeGame
          ? {
              ...prev.activeGame,
              cashoutError: true,
              gameState: "error",
            }
          : null,
      }));

      // Don't throw error - it would crash the component
      // Instead return a failed result
      return {
        success: false,
        error: error.message,
        gameState: "error",
      };
    }
  }, [gameState.activeGame, gameLogic, sessionManager, refreshBalance]);

  // Reset game
  const resetGame = useCallback(() => {
    gameLogic.reset();
    setGameState((prev) => ({
      ...prev,
      activeGame: null,
      error: null,
    }));
  }, [gameLogic]);

  // Get current game status
  const getGameStatus = useCallback(() => {
    return gameLogic.getGameStatus();
  }, [gameLogic]);

  return {
    gameState,
    gameLogic: gameLogic.getGameStatus(),
    startGame,
    revealCell,
    cashOut,
    resetGame,
    refreshBalance,
    getGameStatus,
    formatTokenAmount,
    parseTokenAmount,
  };
};

export const useLocalWheelGame = (tokenActor, userPrincipal) => {
  const [gameLogic] = useState(() => new WheelGameLogic());
  const [sessionManager, setSessionManager] = useState(null);
  const [gameState, setGameState] = useState({
    activeGame: null,
    balance: 0n,
    loading: false,
    error: null,
  });

  // Initialize session manager when token actor is available
  useEffect(() => {
    if (tokenActor && userPrincipal) {
      setSessionManager(new GameSessionManager(tokenActor, userPrincipal));
    }
  }, [tokenActor, userPrincipal]);

  // Refresh balance for wheel game
  const refreshBalance = useCallback(async () => {
    if (!sessionManager) return 0n;

    try {
      const balance = await sessionManager.getBalance();
      setGameState((prev) => ({ ...prev, balance }));
      return balance;
    } catch (error) {
      console.error("Failed to refresh balance:", error);
      // Don't show toast error for balance refresh failures in local games
      console.warn("Balance fetch failed, using cached/default value");
      return 0n;
    }
  }, [sessionManager]);

  // Start spin
  const startSpin = useCallback(
    async (betAmount, selectedMultiplier) => {
      setGameState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        // For local games, we can start the game even without ICP connection
        if (!sessionManager) {
          console.warn("No session manager - starting wheel in offline mode");

          // Start local spin without ICP integration
          const spinData = gameLogic.startSpin(
            parseFloat(betAmount),
            selectedMultiplier
          );

          setGameState((prev) => ({
            ...prev,
            activeGame: {
              ...spinData,
              betAmountFormatted: betAmount,
              transactionId: `offline-${Date.now()}`,
              offlineMode: true,
            },
            loading: false,
          }));

          toast.warning(
            "Started wheel in offline mode - no token transactions"
          );
          return spinData;
        }

        // Try to check balance and place bet if connected
        try {
          const hasBalance = await sessionManager.checkBalance(betAmount);
          if (!hasBalance) {
            throw new Error("Insufficient balance");
          }

          // Place bet on blockchain
          const betResult = await sessionManager.placeBet(betAmount);
          if (!betResult.success) {
            throw new Error("Failed to place bet");
          }

          // Start local spin
          const spinData = gameLogic.startSpin(
            parseFloat(betAmount),
            selectedMultiplier
          );

          setGameState((prev) => ({
            ...prev,
            activeGame: {
              ...spinData,
              betAmountFormatted: betAmount,
              transactionId: betResult.transactionId,
            },
            loading: false,
          }));

          // Refresh balance
          await refreshBalance();

          toast.success(`Wheel spinning! Bet: ${betAmount} APTC`);
          return spinData;
        } catch (icpError) {
          console.warn(
            "ICP integration failed, starting wheel in demo mode:",
            icpError
          );

          // Start spin in demo mode
          const spinData = gameLogic.startSpin(
            parseFloat(betAmount),
            selectedMultiplier
          );

          setGameState((prev) => ({
            ...prev,
            activeGame: {
              ...spinData,
              betAmountFormatted: betAmount,
              transactionId: `demo-${Date.now()}`,
              demoMode: true,
            },
            loading: false,
          }));

          toast.info("Started wheel in demo mode - ICP connection unavailable");
          return spinData;
        }
      } catch (error) {
        setGameState((prev) => ({
          ...prev,
          loading: false,
          error: error.message,
        }));
        throw error;
      }
    },
    [sessionManager, gameLogic, refreshBalance]
  );

  // Complete spin
  const completeSpin = useCallback(async () => {
    if (!gameState.activeGame || gameLogic.gameState !== "spinning") {
      throw new Error("No active spin");
    }

    setGameState((prev) => ({ ...prev, loading: true }));

    try {
      const result = gameLogic.completeSpin();

      // Handle different game modes
      if (gameState.activeGame.offlineMode || gameState.activeGame.demoMode) {
        // In offline/demo mode, just simulate the result
        setGameState((prev) => ({
          ...prev,
          activeGame: {
            ...prev.activeGame,
            ...result,
          },
          loading: false,
        }));

        const mode = gameState.activeGame.offlineMode ? "offline" : "demo";
        if (result.won && result.winAmount > 0) {
          toast.success(
            `🎉 You won in ${mode} mode! Simulated win: ${formatTokenAmount(
              parseTokenAmount(result.winAmount.toString())
            )} APTC!`
          );
        } else {
          toast.info(`Better luck next time! (${mode} mode)`);
        }
        return result;
      }

      // Normal mode with ICP integration - handle winnings
      if (sessionManager && result.won && result.winAmount > 0) {
        try {
          console.log(
            `💰 Processing wheel game winnings of ${result.winAmount}...`
          );

          // Process winnings through ICP
          const winResult = await sessionManager.processWinnings(
            result.winAmount
          );

          // Get updated balance
          const newBalance = await refreshBalance();
          const formattedBalance = formatTokenAmount(newBalance);

          // Update game state with transaction info
          setGameState((prev) => ({
            ...prev,
            activeGame: {
              ...prev.activeGame,
              ...result,
              winTransactionId: winResult.transactionId,
              winProcessedMode: winResult.mode,
            },
            loading: false,
            balance: newBalance,
          }));

          // Show appropriate message based on processing mode
          if (winResult.mode === "live") {
            toast.success(
              `🎉 You won ${formatTokenAmount(
                parseTokenAmount(result.winAmount.toString())
              )} APTC! Balance: ${formattedBalance}`,
              { autoClose: 7000 }
            );
            console.log(
              `✅ Wheel winnings processed with transaction: ${winResult.transactionId}`
            );
          } else {
            toast.info(
              `🎉 You won ${formatTokenAmount(
                parseTokenAmount(result.winAmount.toString())
              )} APTC in ${winResult.mode} mode! Balance: ${formattedBalance}`,
              { autoClose: 7000 }
            );
          }
        } catch (winningsError) {
          console.error("Error processing wheel winnings:", winningsError);
          toast.warning(
            "Win calculated but processing failed. Try manually refreshing your balance.",
            { autoClose: 7000 }
          );

          // Update game state but mark as failed
          setGameState((prev) => ({
            ...prev,
            activeGame: {
              ...prev.activeGame,
              ...result,
              winningsFailed: true,
            },
            loading: false,
          }));
        }
      } else {
        // No win or no session manager
        setGameState((prev) => ({
          ...prev,
          activeGame: {
            ...prev.activeGame,
            ...result,
          },
          loading: false,
        }));

        if (!result.won) {
          toast.info("Better luck next time!");
        } else {
          toast.error("Better luck next time!");
        }
      }

      return result;
    } catch (error) {
      console.error("Wheel game error:", error);

      // Give helpful error message
      toast.error(
        `Wheel spin failed: ${error.message}. Try refreshing and spinning again.`,
        { autoClose: 7000 }
      );

      // Mark game as finished with error state
      setGameState((prev) => ({
        ...prev,
        loading: false,
        error: error.message,
        activeGame: prev.activeGame
          ? {
              ...prev.activeGame,
              spinError: true,
              gameState: "error",
            }
          : null,
      }));

      // Return failed result instead of crashing
      return {
        success: false,
        error: error.message,
        gameState: "error",
      };
    }
  }, [gameState.activeGame, gameLogic, sessionManager, refreshBalance]);

  // Reset game
  const resetGame = useCallback(() => {
    gameLogic.reset();
    setGameState((prev) => ({
      ...prev,
      activeGame: null,
      error: null,
    }));
  }, [gameLogic]);

  // Get wheel segments
  const getWheelSegments = useCallback(() => {
    return gameLogic.getWheelSegments();
  }, [gameLogic]);

  // Get result position for animation
  const getResultPosition = useCallback(() => {
    return gameLogic.getResultPosition();
  }, [gameLogic]);

  return {
    gameState,
    gameLogic: gameLogic.getGameStatus(),
    startSpin,
    completeSpin,
    resetGame,
    refreshBalance,
    getWheelSegments,
    getResultPosition,
    formatTokenAmount,
    parseTokenAmount,
  };
};
