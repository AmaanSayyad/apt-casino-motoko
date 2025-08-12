// ✨ Complete Mines Game Integration Examples
// This file shows you exactly how to call every method from your Motoko contract

import React, { useState, useEffect } from "react";
import { Principal } from "@dfinity/principal";
import { toast } from "react-toastify";
import { useMinesGame } from "../hooks/useMinesGame";
import { useNFID } from "../providers/NFIDProvider";
import {
  createMinesActor,
  createAPTCTokenActor,
  CANISTER_IDS,
} from "../config/aptc-config";

const MinesGameExamples = () => {
  const { isConnected, principal, identity } = useNFID();
  const [minesActor, setMinesActor] = useState(null);
  const [tokenActor, setTokenActor] = useState(null);

  // Initialize actors
  useEffect(() => {
    const initActors = async () => {
      if (!isConnected) return;

      try {
        const mines = await createMinesActor(identity);
        const token = await createAPTCTokenActor(identity);
        setMinesActor(mines);
        setTokenActor(token);
      } catch (error) {
        console.error("Failed to initialize actors:", error);
      }
    };

    initActors();
  }, [isConnected, identity]);

  // Use the comprehensive hook
  const {
    gameState,
    // 🎯 Core game methods
    startGame,
    startGameWithProxy,
    revealCell,
    cashOut,

    // 📊 Query methods
    getActiveGame,
    getMyActiveGame,
    getGameHistory,
    getUserStats,
    getGameStats,
    getBetLimits,
    isGameActive,
    getMultiplierForMines,

    // 💰 Token/balance methods
    getPlayerTokenBalance,
    getPlayerAllowance,
    getRequiredApprovalAmount,
    getGameCanisterPrincipal,

    // 🔧 Admin methods (if you're admin)
    initialize,
    setGameActive,
    setBetLimits,
    clearAllActiveGames,

    // 🐛 Debug methods
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
  } = useMinesGame(minesActor, tokenActor, principal, CANISTER_IDS.mines);

  // 🎮 EXAMPLE USAGE OF ALL METHODS

  // 1. 🎯 CORE GAME METHODS

  const exampleStartGame = async () => {
    try {
      console.log("🎮 Starting a new game...");
      const game = await startGame("1.0", 5); // 1 APTC bet, 5 mines
      console.log("✅ Game started:", game);
      toast.success("Game started successfully!");
    } catch (error) {
      console.error("❌ Start game failed:", error);
      toast.error(error.message);
    }
  };

  const exampleStartGameWithProxy = async () => {
    try {
      const tokenHolderPrincipal = "rdmx6-jaaaa-aaaah-qdrqq-cai"; // Replace with actual principal
      console.log("🎮 Starting game with proxy...");
      const game = await startGameWithProxy(tokenHolderPrincipal, "2.0", 3);
      console.log("✅ Proxy game started:", game);
    } catch (error) {
      console.error("❌ Proxy start failed:", error);
      toast.error(error.message);
    }
  };

  const exampleRevealCell = async () => {
    try {
      console.log("🎲 Revealing cell 5...");
      const updatedGame = await revealCell(5);
      console.log("✅ Cell revealed:", updatedGame);
    } catch (error) {
      console.error("❌ Reveal failed:", error);
      toast.error(error.message);
    }
  };

  const exampleCashOut = async () => {
    try {
      console.log("💰 Cashing out...");
      const result = await cashOut();
      console.log("✅ Cashed out:", result);
      toast.success(`Won ${formatTokenAmount(result.winAmount)} APTC!`);
    } catch (error) {
      console.error("❌ Cash out failed:", error);
      toast.error(error.message);
    }
  };

  // 2. 📊 QUERY METHODS

  const exampleGetActiveGame = async () => {
    try {
      const userPrincipal = principal || "rdmx6-jaaaa-aaaah-qdrqq-cai";
      console.log("🔍 Getting active game...");
      const activeGame = await getActiveGame(userPrincipal);
      console.log("✅ Active game:", activeGame);

      if (activeGame) {
        console.log(`Game state: ${Object.keys(activeGame.gameState)[0]}`);
        console.log(
          `Bet amount: ${formatTokenAmount(activeGame.betAmount)} APTC`
        );
        console.log(`Mine count: ${Number(activeGame.mineCount)}`);
        console.log(`Multiplier: ${activeGame.multiplier.toFixed(2)}x`);
      } else {
        console.log("No active game found");
      }
    } catch (error) {
      console.error("❌ Get active game failed:", error);
    }
  };

  const exampleGetGameHistory = async () => {
    try {
      const userPrincipal = principal || "rdmx6-jaaaa-aaaah-qdrqq-cai";
      console.log("📜 Getting game history...");
      const history = await getGameHistory(userPrincipal, 5); // Last 5 games
      console.log("✅ Game history:", history);

      history.forEach((game, index) => {
        console.log(`Game ${index + 1}:`);
        console.log(`  - Bet: ${formatTokenAmount(game.betAmount)} APTC`);
        console.log(`  - Won: ${formatTokenAmount(game.winAmount)} APTC`);
        console.log(`  - State: ${Object.keys(game.gameState)[0]}`);
        console.log(`  - Mines: ${Number(game.mineCount)}`);
      });
    } catch (error) {
      console.error("❌ Get history failed:", error);
    }
  };

  const exampleGetUserStats = async () => {
    try {
      const userPrincipal = principal || "rdmx6-jaaaa-aaaah-qdrqq-cai";
      console.log("📊 Getting user stats...");
      const stats = await getUserStats(userPrincipal);
      console.log("✅ User stats:", stats);

      if (stats) {
        console.log(`Total games: ${Number(stats.gamesPlayed)}`);
        console.log(
          `Total wagered: ${formatTokenAmount(stats.totalWagered)} APTC`
        );
        console.log(`Total won: ${formatTokenAmount(stats.totalWon)} APTC`);
        console.log(`Biggest win: ${formatTokenAmount(stats.biggestWin)} APTC`);
        console.log(
          `Win rate: ${(
            (Number(stats.totalWon) / Number(stats.totalWagered)) *
            100
          ).toFixed(2)}%`
        );
      }
    } catch (error) {
      console.error("❌ Get user stats failed:", error);
    }
  };

  const exampleGetGameStats = async () => {
    try {
      console.log("🎮 Getting game stats...");
      const stats = await getGameStats();
      console.log("✅ Game stats:", stats);

      if (stats) {
        console.log(`Total games: ${Number(stats.totalGames)}`);
        console.log(
          `Total volume: ${formatTokenAmount(stats.totalVolume)} APTC`
        );
        console.log(
          `House profits: ${formatTokenAmount(stats.houseProfits)} APTC`
        );
        console.log(`Active games: ${Number(stats.activeGamesCount)}`);
      }
    } catch (error) {
      console.error("❌ Get game stats failed:", error);
    }
  };

  const exampleGetMultiplier = async () => {
    try {
      console.log("🔢 Getting multiplier for 5 mines, 3 revealed...");
      const multiplier = await getMultiplierForMines(5, 3);
      console.log(`✅ Multiplier: ${multiplier.toFixed(2)}x`);
    } catch (error) {
      console.error("❌ Get multiplier failed:", error);
    }
  };

  // 3. 💰 TOKEN/BALANCE METHODS

  const exampleGetBalance = async () => {
    try {
      const userPrincipal = principal || "rdmx6-jaaaa-aaaah-qdrqq-cai";
      console.log("💰 Getting token balance...");
      const balance = await getPlayerTokenBalance(userPrincipal);
      console.log(`✅ Balance: ${balance} APTC`);
    } catch (error) {
      console.error("❌ Get balance failed:", error);
    }
  };

  const exampleGetAllowance = async () => {
    try {
      console.log("🔒 Getting allowance...");
      const allowance = await getPlayerAllowance();
      console.log(`✅ Allowance: ${allowance} APTC`);
    } catch (error) {
      console.error("❌ Get allowance failed:", error);
    }
  };

  const exampleGetRequiredApproval = async () => {
    try {
      console.log("📋 Getting required approval for 1 APTC bet...");
      const required = await getRequiredApprovalAmount("1.0");
      console.log(`✅ Required approval: ${required} APTC`);
    } catch (error) {
      console.error("❌ Get required approval failed:", error);
    }
  };

  // 4. 🐛 DEBUG METHODS

  const exampleDebugStartGame = async () => {
    try {
      const userPrincipal = principal || "rdmx6-jaaaa-aaaah-qdrqq-cai";
      console.log("🔍 Debugging start game issue...");
      const debug = await debugStartGameIssue(userPrincipal, "1.0");
      console.log("✅ Debug info:", debug);

      if (debug) {
        console.log(
          `User balance: ${formatTokenAmount(debug.user_balance)} APTC`
        );
        console.log(
          `Required amount: ${formatTokenAmount(debug.required_amount)} APTC`
        );
        console.log(`Has allowance: ${debug.has_allowance}`);
        console.log(`Balance sufficient: ${debug.balance_sufficient}`);
        console.log(`Game active: ${debug.game_active}`);
        console.log(`Has active game: ${debug.has_active_game}`);
      }
    } catch (error) {
      console.error("❌ Debug failed:", error);
    }
  };

  const exampleClearGame = async () => {
    try {
      console.log("🧹 Clearing active game...");
      const result = await clearActiveGame();
      console.log("✅ Game cleared:", result);
      toast.success("Game cleared successfully!");
    } catch (error) {
      console.error("❌ Clear game failed:", error);
      toast.error(error.message);
    }
  };

  const exampleGetActiveGameCount = async () => {
    try {
      console.log("🔢 Getting active game count...");
      const count = await getActiveGameCount();
      console.log(`✅ Active games: ${count}`);
    } catch (error) {
      console.error("❌ Get count failed:", error);
    }
  };

  const exampleWhoAmI = async () => {
    try {
      console.log("🔍 Getting my principal...");
      const myPrincipal = await whoAmI();
      console.log(`✅ I am: ${myPrincipal}`);
    } catch (error) {
      console.error("❌ Who am I failed:", error);
    }
  };

  // 5. 🔧 ADMIN METHODS (Only if you're admin)

  const exampleSetBetLimits = async () => {
    try {
      console.log("🔧 Setting bet limits...");
      const result = await setBetLimits("0.1", "100.0"); // Min 0.1 APTC, Max 100 APTC
      console.log("✅ Bet limits set:", result);
      toast.success("Bet limits updated!");
    } catch (error) {
      console.error("❌ Set bet limits failed:", error);
      toast.error("Only admin can set bet limits");
    }
  };

  const exampleSetGameActive = async () => {
    try {
      console.log("🔧 Activating game...");
      const result = await setGameActive(true);
      console.log("✅ Game activated:", result);
      toast.success("Game activated!");
    } catch (error) {
      console.error("❌ Set game active failed:", error);
      toast.error("Only admin can activate/deactivate game");
    }
  };

  // Component render with all example buttons
  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-900 text-white rounded-lg">
      <h1 className="text-3xl font-bold mb-6 text-center">
        🎮 Complete Mines Game Integration Examples
      </h1>

      {!isConnected && (
        <div className="bg-yellow-600 text-black p-4 rounded-lg mb-6">
          ⚠️ Please connect your wallet to test these methods
        </div>
      )}

      {/* Game State Display */}
      <div className="bg-gray-800 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-bold mb-3">🎯 Current Game State</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-gray-400">Balance</div>
            <div className="font-bold">{gameState.balance} APTC</div>
          </div>
          <div>
            <div className="text-gray-400">Allowance</div>
            <div className="font-bold">{gameState.allowance} APTC</div>
          </div>
          <div>
            <div className="text-gray-400">Active Game</div>
            <div className="font-bold">
              {gameState.activeGame ? "✅ Yes" : "❌ No"}
            </div>
          </div>
          <div>
            <div className="text-gray-400">Loading</div>
            <div className="font-bold">
              {gameState.loading ? "⏳ Yes" : "✅ Ready"}
            </div>
          </div>
        </div>
      </div>

      {/* Core Game Methods */}
      <div className="bg-gray-800 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-bold mb-3">🎯 Core Game Methods</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={exampleStartGame}
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
          >
            Start Game
          </button>
          <button
            onClick={exampleRevealCell}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
          >
            Reveal Cell
          </button>
          <button
            onClick={exampleCashOut}
            className="bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded"
          >
            Cash Out
          </button>
          <button
            onClick={exampleStartGameWithProxy}
            className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded"
          >
            Start with Proxy
          </button>
        </div>
      </div>

      {/* Query Methods */}
      <div className="bg-gray-800 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-bold mb-3">📊 Query Methods</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={exampleGetActiveGame}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
          >
            Get Active Game
          </button>
          <button
            onClick={exampleGetGameHistory}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
          >
            Get History
          </button>
          <button
            onClick={exampleGetUserStats}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
          >
            Get User Stats
          </button>
          <button
            onClick={exampleGetGameStats}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
          >
            Get Game Stats
          </button>
          <button
            onClick={exampleGetMultiplier}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
          >
            Get Multiplier
          </button>
        </div>
      </div>

      {/* Token Methods */}
      <div className="bg-gray-800 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-bold mb-3">💰 Token Methods</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <button
            onClick={exampleGetBalance}
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
          >
            Get Balance
          </button>
          <button
            onClick={exampleGetAllowance}
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
          >
            Get Allowance
          </button>
          <button
            onClick={exampleGetRequiredApproval}
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
          >
            Get Required Approval
          </button>
        </div>
      </div>

      {/* Debug Methods */}
      <div className="bg-gray-800 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-bold mb-3">🐛 Debug Methods</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={exampleDebugStartGame}
            className="bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded"
          >
            Debug Start Game
          </button>
          <button
            onClick={exampleClearGame}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
          >
            Clear Game
          </button>
          <button
            onClick={exampleGetActiveGameCount}
            className="bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded"
          >
            Get Game Count
          </button>
          <button
            onClick={exampleWhoAmI}
            className="bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded"
          >
            Who Am I
          </button>
        </div>
      </div>

      {/* Admin Methods */}
      <div className="bg-gray-800 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-bold mb-3">
          🔧 Admin Methods (Admin Only)
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <button
            onClick={exampleSetBetLimits}
            className="bg-red-800 hover:bg-red-900 px-4 py-2 rounded"
          >
            Set Bet Limits
          </button>
          <button
            onClick={exampleSetGameActive}
            className="bg-red-800 hover:bg-red-900 px-4 py-2 rounded"
          >
            Activate Game
          </button>
          <button
            onClick={() => console.log("Check console for all method examples")}
            className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded"
          >
            View Console Logs
          </button>
        </div>
      </div>

      {/* Refresh Data */}
      <div className="text-center">
        <button
          onClick={refreshAllData}
          disabled={gameState.loading}
          className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-bold disabled:opacity-50"
        >
          🔄 Refresh All Data
        </button>
      </div>

      {/* Instructions */}
      <div className="bg-gray-800 p-4 rounded-lg mt-6">
        <h2 className="text-xl font-bold mb-3">📖 How to Use</h2>
        <ol className="list-decimal list-inside space-y-2">
          <li>Connect your wallet</li>
          <li>Click any button to test the corresponding method</li>
          <li>Check the browser console for detailed logs</li>
          <li>View the Network tab to see actual canister calls</li>
          <li>All methods return proper error handling and success messages</li>
        </ol>
      </div>
    </div>
  );
};

export default MinesGameExamples;
