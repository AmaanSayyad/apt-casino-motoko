// Complete Mines Game Hook
import { useState, useCallback, useEffect } from "react";
import { Principal } from "@dfinity/principal";
import { toast } from "react-toastify";

export const useMinesGame = (
  minesActor,
  tokenActor,
  userPrincipal,
  gameCanisterId
) => {
  const [gameState, setGameState] = useState({
    activeGame: null,
    userStats: null,
    gameHistory: [],
    balance: "0",
    allowance: "0",
    gameStats: null,
    betLimits: { minBet: "0", maxBet: "0" },
    loading: false,
    error: null,
    isGameActive: true,
  });

  // Utility functions
  const formatTokenAmount = (amount, decimals = 8) => {
    if (!amount || amount === 0n) return "0.00";
    try {
      const divisor = Math.pow(10, decimals);
      const numAmount = Number(amount);
      if (isNaN(numAmount)) return "0.00";
      return (numAmount / divisor).toFixed(2);
    } catch (error) {
      console.warn("Error formatting token amount:", error);
      return "0.00";
    }
  };

  const parseTokenAmount = (amount, decimals = 8) => {
    if (!amount || isNaN(Number(amount))) return BigInt(0);
    try {
      const multiplier = Math.pow(10, decimals);
      const numAmount = Number(amount);
      return BigInt(Math.floor(numAmount * multiplier));
    } catch (error) {
      console.warn("Error parsing token amount:", error);
      return BigInt(0);
    }
  };

  // Helper to handle results
  const handleResult = (result, successMessage) => {
    if ("Err" in result) {
      const errorType = Object.keys(result.Err)[0];
      const errorMessage = result.Err[errorType] || errorType;
      throw new Error(`${errorMessage}`);
    }
    if (successMessage) {
      toast.success(successMessage);
    }
    return result.Ok;
  };

  // 🎯 CORE GAME METHODS

  // 1. Start Game
  const startGame = useCallback(
    async (betAmount, mineCount) => {
      if (!minesActor || !tokenActor || !userPrincipal) {
        throw new Error("Game not initialized or wallet not connected");
      }

      try {
        setGameState((prev) => ({ ...prev, loading: true, error: null }));

        const betAmountBigInt = parseTokenAmount(betAmount);
        const mineCountBigInt = BigInt(mineCount);

        // Get required approval amount
        const requiredApproval = await minesActor.getRequiredApprovalAmount(
          betAmountBigInt
        );

        // Approve tokens
        const approveResult = await tokenActor.icrc2_approve({
          from_subaccount: [],
          spender: {
            owner: Principal.fromText(gameCanisterId),
            subaccount: [],
          },
          amount: requiredApproval,
          expected_allowance: [],
          expires_at: [],
          fee: [],
          memo: [],
          created_at_time: [],
        });

        handleResult(approveResult, null);

        // Start the game
        const gameResult = await minesActor.startGame(
          betAmountBigInt,
          mineCountBigInt
        );
        const game = handleResult(gameResult, "Game started successfully!");

        setGameState((prev) => ({
          ...prev,
          activeGame: game,
          loading: false,
        }));

        return game;
      } catch (error) {
        setGameState((prev) => ({
          ...prev,
          error: error.message,
          loading: false,
        }));
        toast.error(error.message);
        throw error;
      }
    },
    [minesActor, tokenActor, userPrincipal, gameCanisterId]
  );

  // 2. Start Game with Proxy
  const startGameWithProxy = useCallback(
    async (tokenHolder, betAmount, mineCount) => {
      if (!minesActor) throw new Error("Game not initialized");

      try {
        setGameState((prev) => ({ ...prev, loading: true, error: null }));

        const result = await minesActor.startGameWithProxy(
          Principal.fromText(tokenHolder),
          parseTokenAmount(betAmount),
          BigInt(mineCount)
        );

        const game = handleResult(
          result,
          "Game started with proxy successfully!"
        );

        setGameState((prev) => ({
          ...prev,
          activeGame: game,
          loading: false,
        }));

        return game;
      } catch (error) {
        setGameState((prev) => ({
          ...prev,
          error: error.message,
          loading: false,
        }));
        toast.error(error.message);
        throw error;
      }
    },
    [minesActor]
  );

  // 3. Reveal Cell
  const revealCell = useCallback(
    async (cellIndex) => {
      if (!minesActor) throw new Error("Game not initialized");

      try {
        setGameState((prev) => ({ ...prev, loading: true }));

        const result = await minesActor.revealCell(BigInt(cellIndex));
        const updatedGame = handleResult(result, null);

        // Check game state for notifications
        const gameState = updatedGame.gameState;
        if ("Lost" in gameState) {
          toast.error("💥 You hit a mine! Game over.");
        } else if ("Won" in gameState) {
          toast.success("🎉 Congratulations! You won!");
        } else {
          const multiplier = updatedGame.multiplier.toFixed(2);
          toast.success(`💎 Safe! Multiplier: ${multiplier}x`);
        }

        setGameState((prev) => ({
          ...prev,
          activeGame: updatedGame,
          loading: false,
        }));

        return updatedGame;
      } catch (error) {
        setGameState((prev) => ({
          ...prev,
          error: error.message,
          loading: false,
        }));
        toast.error(error.message);
        throw error;
      }
    },
    [minesActor]
  );

  // 4. Cash Out
  const cashOut = useCallback(async () => {
    if (!minesActor) throw new Error("Game not initialized");

    try {
      setGameState((prev) => ({ ...prev, loading: true }));

      const result = await minesActor.cashOut();
      const gameResult = handleResult(result, null);

      const winAmount = formatTokenAmount(gameResult.winAmount);
      toast.success(`🎉 Cashed out ${winAmount} APTC!`);

      setGameState((prev) => ({
        ...prev,
        activeGame: null,
        loading: false,
      }));

      return gameResult;
    } catch (error) {
      setGameState((prev) => ({
        ...prev,
        error: error.message,
        loading: false,
      }));
      toast.error(error.message);
      throw error;
    }
  }, [minesActor]);

  // 📊 QUERY METHODS

  // 5. Get Active Game
  const getActiveGame = useCallback(
    async (playerPrincipal = userPrincipal) => {
      if (!minesActor || !playerPrincipal) return null;

      try {
        const result = await minesActor.getActiveGame(
          Principal.fromText(playerPrincipal)
        );
        return result.length > 0 ? result[0] : null;
      } catch (error) {
        console.error("Get active game error:", error);
        return null;
      }
    },
    [minesActor, userPrincipal]
  );

  // 6. Get My Active Game
  const getMyActiveGame = useCallback(async () => {
    if (!minesActor) return null;

    try {
      const result = await minesActor.getMyActiveGame();
      return handleResult(result, null);
    } catch (error) {
      console.error("Get my active game error:", error);
      return null;
    }
  }, [minesActor]);

  // 7. Get Game History
  const getGameHistory = useCallback(
    async (playerPrincipal = userPrincipal, limit = 10) => {
      if (!minesActor || !playerPrincipal) return [];

      try {
        const result = await minesActor.getGameHistory(
          Principal.fromText(playerPrincipal),
          limit ? [BigInt(limit)] : []
        );
        return result;
      } catch (error) {
        console.error("Get game history error:", error);
        return [];
      }
    },
    [minesActor, userPrincipal]
  );

  // 8. Get User Stats
  const getUserStats = useCallback(
    async (playerPrincipal = userPrincipal) => {
      if (!minesActor || !playerPrincipal) return null;

      try {
        const result = await minesActor.getUserStats(
          Principal.fromText(playerPrincipal)
        );
        return result.length > 0 ? result[0] : null;
      } catch (error) {
        console.error("Get user stats error:", error);
        return null;
      }
    },
    [minesActor, userPrincipal]
  );

  // 9. Get Game Stats
  const getGameStats = useCallback(async () => {
    if (!minesActor) return null;

    try {
      return await minesActor.getGameStats();
    } catch (error) {
      console.error("Get game stats error:", error);
      return null;
    }
  }, [minesActor]);

  // 10. Get Bet Limits
  const getBetLimits = useCallback(async () => {
    if (!minesActor) return { minBet: "0", maxBet: "0" };

    try {
      const result = await minesActor.getBetLimits();
      return {
        minBet: formatTokenAmount(result.minBet),
        maxBet: formatTokenAmount(result.maxBet),
      };
    } catch (error) {
      console.error("Get bet limits error:", error);
      return { minBet: "0", maxBet: "0" };
    }
  }, [minesActor]);

  // 11. Is Game Active
  const isGameActive = useCallback(async () => {
    if (!minesActor) return false;

    try {
      return await minesActor.isGameActive();
    } catch (error) {
      console.error("Is game active error:", error);
      return false;
    }
  }, [minesActor]);

  // 12. Get Multiplier for Mines
  const getMultiplierForMines = useCallback(
    async (mineCount, revealedCount) => {
      if (!minesActor) return 1.0;

      try {
        return await minesActor.getMultiplierForMines(
          BigInt(mineCount),
          BigInt(revealedCount)
        );
      } catch (error) {
        console.error("Get multiplier error:", error);
        return 1.0;
      }
    },
    [minesActor]
  );

  // 💰 TOKEN/BALANCE METHODS

  // 13. Get Player Token Balance
  const getPlayerTokenBalance = useCallback(
    async (playerPrincipal = userPrincipal) => {
      if (!minesActor || !playerPrincipal) return "0";

      try {
        const balance = await minesActor.getPlayerTokenBalance(
          Principal.fromText(playerPrincipal)
        );
        return formatTokenAmount(balance);
      } catch (error) {
        console.error("Get player token balance error:", error);
        return "0";
      }
    },
    [minesActor, userPrincipal]
  );

  // 14. Get Player Allowance
  const getPlayerAllowance = useCallback(async () => {
    if (!minesActor) return "0";

    try {
      const allowance = await minesActor.getPlayerAllowance();
      return formatTokenAmount(allowance);
    } catch (error) {
      console.error("Get player allowance error:", error);
      return "0";
    }
  }, [minesActor]);

  // 15. Get Required Approval Amount
  const getRequiredApprovalAmount = useCallback(
    async (betAmount) => {
      if (!minesActor) return "0";

      try {
        const required = await minesActor.getRequiredApprovalAmount(
          parseTokenAmount(betAmount)
        );
        return formatTokenAmount(required);
      } catch (error) {
        console.error("Get required approval amount error:", error);
        return "0";
      }
    },
    [minesActor]
  );

  // 16. Get Game Canister Principal
  const getGameCanisterPrincipal = useCallback(async () => {
    if (!minesActor) return "";

    try {
      const principal = await minesActor.getGameCanisterPrincipal();
      return principal.toText();
    } catch (error) {
      console.error("Get game canister principal error:", error);
      return "";
    }
  }, [minesActor]);

  // 🔧 ADMIN METHODS (if you're an admin)

  // 17. Initialize
  const initialize = useCallback(
    async (treasuryAddress) => {
      if (!minesActor) throw new Error("Game not initialized");

      try {
        const result = await minesActor.initialize(
          Principal.fromText(treasuryAddress)
        );
        return handleResult(result, "Game initialized successfully!");
      } catch (error) {
        toast.error(error.message);
        throw error;
      }
    },
    [minesActor]
  );

  // 18. Set Game Active
  const setGameActive = useCallback(
    async (active) => {
      if (!minesActor) throw new Error("Game not initialized");

      try {
        const result = await minesActor.setGameActive(active);
        return handleResult(
          result,
          `Game ${active ? "activated" : "deactivated"} successfully!`
        );
      } catch (error) {
        toast.error(error.message);
        throw error;
      }
    },
    [minesActor]
  );

  // 19. Set Bet Limits
  const setBetLimits = useCallback(
    async (minBet, maxBet) => {
      if (!minesActor) throw new Error("Game not initialized");

      try {
        const result = await minesActor.setBetLimits(
          parseTokenAmount(minBet),
          parseTokenAmount(maxBet)
        );
        return handleResult(result, "Bet limits updated successfully!");
      } catch (error) {
        toast.error(error.message);
        throw error;
      }
    },
    [minesActor]
  );

  // 20. Clear All Active Games
  const clearAllActiveGames = useCallback(async () => {
    if (!minesActor) throw new Error("Game not initialized");

    try {
      const result = await minesActor.clearAllActiveGames();
      return handleResult(result, "All active games cleared!");
    } catch (error) {
      toast.error(error.message);
      throw error;
    }
  }, [minesActor]);

  // 🐛 DEBUG METHODS

  // 21. Who Am I
  const whoAmI = useCallback(async () => {
    if (!minesActor) return "";

    try {
      const principal = await minesActor.whoAmI();
      return principal.toText();
    } catch (error) {
      console.error("Who am I error:", error);
      return "";
    }
  }, [minesActor]);

  // 22. Get Active Game Count
  const getActiveGameCount = useCallback(async () => {
    if (!minesActor) return 0;

    try {
      const count = await minesActor.getActiveGameCount();
      return Number(count);
    } catch (error) {
      console.error("Get active game count error:", error);
      return 0;
    }
  }, [minesActor]);

  // 23. Debug Active Games
  const debugActiveGames = useCallback(async () => {
    if (!minesActor) return [];

    try {
      return await minesActor.debugActiveGames();
    } catch (error) {
      console.error("Debug active games error:", error);
      return [];
    }
  }, [minesActor]);

  // 24. Clear Active Game
  const clearActiveGame = useCallback(async () => {
    if (!minesActor) throw new Error("Game not initialized");

    try {
      const result = await minesActor.clearActiveGame();
      const message = handleResult(result, "Active game cleared!");

      setGameState((prev) => ({ ...prev, activeGame: null }));
      return message;
    } catch (error) {
      toast.error(error.message);
      throw error;
    }
  }, [minesActor]);

  // 25. Force End Game
  const forceEndGame = useCallback(async () => {
    if (!minesActor) throw new Error("Game not initialized");

    try {
      const result = await minesActor.forceEndGame();
      const message = handleResult(result, "Game force ended!");

      setGameState((prev) => ({ ...prev, activeGame: null }));
      return message;
    } catch (error) {
      toast.error(error.message);
      throw error;
    }
  }, [minesActor]);

  // 26. Admin Clear User Game
  const adminClearUserGame = useCallback(
    async (userPrincipal) => {
      if (!minesActor) throw new Error("Game not initialized");

      try {
        const result = await minesActor.adminClearUserGame(
          Principal.fromText(userPrincipal)
        );
        return handleResult(result, "User game cleared!");
      } catch (error) {
        toast.error(error.message);
        throw error;
      }
    },
    [minesActor]
  );

  // 27. Admin List Active Games
  const adminListActiveGames = useCallback(async () => {
    if (!minesActor) return [];

    try {
      return await minesActor.adminListActiveGames();
    } catch (error) {
      console.error("Admin list active games error:", error);
      return [];
    }
  }, [minesActor]);

  // 28. Debug Start Game Issue
  const debugStartGameIssue = useCallback(
    async (userPrincipal, betAmount) => {
      if (!minesActor) return null;

      try {
        return await minesActor.debugStartGameIssue(
          Principal.fromText(userPrincipal),
          parseTokenAmount(betAmount)
        );
      } catch (error) {
        console.error("Debug start game issue error:", error);
        return null;
      }
    },
    [minesActor]
  );

  // 29. Debug Get Caller
  const debugGetCaller = useCallback(async () => {
    if (!minesActor) return "";

    try {
      const principal = await minesActor.debugGetCaller();
      return principal.toText();
    } catch (error) {
      console.error("Debug get caller error:", error);
      return "";
    }
  }, [minesActor]);

  // 30. Debug Transfer Setup
  const debugTransferSetup = useCallback(
    async (targetPrincipal, betAmount) => {
      if (!minesActor) return null;

      try {
        return await minesActor.debugTransferSetup(
          Principal.fromText(targetPrincipal),
          parseTokenAmount(betAmount)
        );
      } catch (error) {
        console.error("Debug transfer setup error:", error);
        return null;
      }
    },
    [minesActor]
  );

  // Comprehensive data refresh
  const refreshAllData = useCallback(async () => {
    if (!minesActor || !userPrincipal) return;

    try {
      const [
        activeGame,
        userStats,
        gameHistory,
        balance,
        allowance,
        gameStats,
        betLimits,
        gameActive,
      ] = await Promise.all([
        getActiveGame(),
        getUserStats(),
        getGameHistory(),
        getPlayerTokenBalance(),
        getPlayerAllowance(),
        getGameStats(),
        getBetLimits(),
        isGameActive(),
      ]);

      setGameState((prev) => ({
        ...prev,
        activeGame,
        userStats,
        gameHistory,
        balance,
        allowance,
        gameStats,
        betLimits,
        isGameActive: gameActive,
        error: null,
      }));
    } catch (error) {
      setGameState((prev) => ({ ...prev, error: error.message }));
      console.error("Refresh all data error:", error);
    }
  }, [
    minesActor,
    userPrincipal,
    getActiveGame,
    getUserStats,
    getGameHistory,
    getPlayerTokenBalance,
    getPlayerAllowance,
    getGameStats,
    getBetLimits,
    isGameActive,
  ]);

  // Auto-refresh data when actors or user changes
  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  // Return all methods and state
  return {
    // State
    gameState,

    // Core game methods
    startGame,
    startGameWithProxy,
    revealCell,
    cashOut,

    // Query methods
    getActiveGame,
    getMyActiveGame,
    getGameHistory,
    getUserStats,
    getGameStats,
    getBetLimits,
    isGameActive,
    getMultiplierForMines,

    // Token/balance methods
    getPlayerTokenBalance,
    getPlayerAllowance,
    getRequiredApprovalAmount,
    getGameCanisterPrincipal,

    // Admin methods
    initialize,
    setGameActive,
    setBetLimits,
    clearAllActiveGames,

    // Debug methods
    whoAmI,
    getActiveGameCount,
    debugActiveGames,
    clearActiveGame,
    forceEndGame,
    adminClearUserGame,
    adminListActiveGames,
    debugStartGameIssue,
    debugGetCaller,
    debugTransferSetup,

    // Utility methods
    refreshAllData,
    formatTokenAmount,
    parseTokenAmount,
    handleResult,
  };
};
