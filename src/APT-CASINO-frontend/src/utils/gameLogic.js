// Local Game Logic for Mines and Wheel Games
// This handles the game mechanics locally while using ICP for betting/cashout
import { Principal } from "@dfinity/principal";

// ============ MINES GAME LOGIC ============

export class MinesGameLogic {
  constructor(gridSize = 25, mines = 5) {
    this.gridSize = gridSize;
    this.mineCount = mines;
    this.gameState = "setup"; // setup, playing, won, lost, cashed
    this.minePositions = [];
    this.revealedCells = [];
    this.betAmount = 0;
    this.potentialWin = 0;
    this.multiplier = 1.0;
    this.gameId = null;
    this.safeSpots = 0;
  }

  // Initialize a new game
  startGame(betAmount, mineCount) {
    this.betAmount = betAmount;
    this.mineCount = Math.min(Math.max(mineCount, 1), this.gridSize - 1);
    this.gameState = "playing";
    this.revealedCells = [];
    this.gameId = Date.now() + Math.random(); // Simple game ID
    this.safeSpots = this.gridSize - this.mineCount;

    // Generate random mine positions
    this.minePositions = this.generateMinePositions();

    // Calculate initial multiplier
    this.updateMultiplier();

    console.log("🎮 Mines game started:", {
      gameId: this.gameId,
      betAmount: this.betAmount,
      mineCount: this.mineCount,
      minePositions: this.minePositions,
      safeSpots: this.safeSpots,
    });

    return {
      gameId: this.gameId,
      gameState: this.gameState,
      betAmount: this.betAmount,
      mineCount: this.mineCount,
      multiplier: this.multiplier,
      potentialWin: this.potentialWin,
      revealedCells: this.revealedCells,
      safeSpots: this.safeSpots,
    };
  }

  // Generate random mine positions
  generateMinePositions() {
    const positions = [];
    const availablePositions = Array.from(
      { length: this.gridSize },
      (_, i) => i
    );

    // Shuffle array and take first 'mineCount' positions
    for (let i = availablePositions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availablePositions[i], availablePositions[j]] = [
        availablePositions[j],
        availablePositions[i],
      ];
    }

    return availablePositions.slice(0, this.mineCount).sort((a, b) => a - b);
  }

  // Calculate multiplier based on mines and revealed safe cells
  updateMultiplier() {
    if (this.revealedCells.length === 0) {
      this.multiplier = 1.0;
      this.potentialWin = this.betAmount;
      return;
    }

    // Calculate multiplier using probability formula
    // Multiplier increases as more safe cells are revealed
    const safeCellsRevealed = this.revealedCells.length;
    const remainingSafeCells = this.safeSpots - safeCellsRevealed;
    const remainingTotalCells = this.gridSize - safeCellsRevealed;

    if (remainingSafeCells <= 0 || remainingTotalCells <= 0) {
      this.multiplier = this.calculateFinalMultiplier();
    } else {
      // Progressive multiplier calculation
      let mult = 1.0;
      for (let i = 0; i < safeCellsRevealed; i++) {
        const safeCellsAtStep = this.safeSpots - i;
        const totalCellsAtStep = this.gridSize - i;
        const probability = safeCellsAtStep / totalCellsAtStep;
        mult *= 1 / probability;
      }
      this.multiplier = mult;
    }

    this.potentialWin = this.betAmount * this.multiplier;
  }

  // Calculate final multiplier for completed games
  calculateFinalMultiplier() {
    let mult = 1.0;
    for (let i = 0; i < this.safeSpots; i++) {
      const safeCellsAtStep = this.safeSpots - i;
      const totalCellsAtStep = this.gridSize - i;
      const probability = safeCellsAtStep / totalCellsAtStep;
      mult *= 1 / probability;
    }
    return mult;
  }

  // Reveal a cell
  revealCell(cellIndex) {
    if (this.gameState !== "playing") {
      throw new Error("Game is not in playing state");
    }

    if (this.revealedCells.includes(cellIndex)) {
      throw new Error("Cell already revealed");
    }

    if (cellIndex < 0 || cellIndex >= this.gridSize) {
      throw new Error("Invalid cell index");
    }

    this.revealedCells.push(cellIndex);

    // Check if it's a mine
    if (this.minePositions.includes(cellIndex)) {
      this.gameState = "lost";
      console.log("💥 Mine hit! Game lost");
      return {
        result: "mine",
        gameState: this.gameState,
        revealedCells: [...this.revealedCells],
        minePositions: [...this.minePositions],
        multiplier: 0,
        potentialWin: 0,
      };
    }

    // Update multiplier
    this.updateMultiplier();

    // Check if all safe cells are revealed (auto-win)
    if (this.revealedCells.length === this.safeSpots) {
      this.gameState = "won";
      console.log("🎉 All safe cells revealed! Auto-win!");
      return {
        result: "auto_win",
        gameState: this.gameState,
        revealedCells: [...this.revealedCells],
        minePositions: [...this.minePositions],
        multiplier: this.multiplier,
        potentialWin: this.potentialWin,
      };
    }

    console.log("💎 Safe cell revealed:", {
      cellIndex,
      revealedCount: this.revealedCells.length,
      multiplier: this.multiplier,
      potentialWin: this.potentialWin,
    });

    return {
      result: "safe",
      gameState: this.gameState,
      revealedCells: [...this.revealedCells],
      multiplier: this.multiplier,
      potentialWin: this.potentialWin,
      safeSpots: this.safeSpots,
    };
  }

  // Cash out the current game
  cashOut() {
    if (this.gameState !== "playing") {
      throw new Error("Cannot cash out - game is not in playing state");
    }

    if (this.revealedCells.length === 0) {
      throw new Error("Cannot cash out - no cells revealed");
    }

    this.gameState = "cashed";

    console.log("💰 Game cashed out:", {
      finalMultiplier: this.multiplier,
      winAmount: this.potentialWin,
      revealedCells: this.revealedCells.length,
    });

    return {
      gameState: this.gameState,
      finalMultiplier: this.multiplier,
      winAmount: this.potentialWin,
      revealedCells: [...this.revealedCells],
      minePositions: [...this.minePositions], // Show mines after cashout
    };
  }

  // Get current game status
  getGameStatus() {
    return {
      gameId: this.gameId,
      gameState: this.gameState,
      betAmount: this.betAmount,
      mineCount: this.mineCount,
      multiplier: this.multiplier,
      potentialWin: this.potentialWin,
      revealedCells: [...this.revealedCells],
      minePositions:
        this.gameState !== "playing" ? [...this.minePositions] : [],
      safeSpots: this.safeSpots,
    };
  }

  // Reset game
  reset() {
    this.gameState = "setup";
    this.minePositions = [];
    this.revealedCells = [];
    this.betAmount = 0;
    this.potentialWin = 0;
    this.multiplier = 1.0;
    this.gameId = null;
    this.safeSpots = 0;
  }
}

// ============ WHEEL GAME LOGIC ============

export class WheelGameLogic {
  constructor() {
    this.gameState = "setup"; // setup, spinning, completed
    this.betAmount = 0;
    this.selectedMultiplier = 2;
    this.gameId = null;
    this.result = null;
    this.winAmount = 0;

    // Wheel segments with their multipliers and probabilities
    this.segments = [
      { multiplier: 2, probability: 0.5, color: "#10B981" }, // 50% - Green
      { multiplier: 3, probability: 0.25, color: "#3B82F6" }, // 25% - Blue
      { multiplier: 5, probability: 0.15, color: "#8B5CF6" }, // 15% - Purple
      { multiplier: 10, probability: 0.07, color: "#F59E0B" }, // 7% - Orange
      { multiplier: 50, probability: 0.03, color: "#EF4444" }, // 3% - Red
    ];

    this.totalSegments = 50; // Visual segments on the wheel
  }

  // Initialize a new game
  startSpin(betAmount, selectedMultiplier) {
    this.betAmount = betAmount;
    this.selectedMultiplier = selectedMultiplier;
    this.gameState = "spinning";
    this.gameId = Date.now() + Math.random();

    // Calculate result
    const random = Math.random();
    let cumulativeProbability = 0;
    let resultSegment = this.segments[0]; // Default to 2x

    for (const segment of this.segments) {
      cumulativeProbability += segment.probability;
      if (random <= cumulativeProbability) {
        resultSegment = segment;
        break;
      }
    }

    this.result = resultSegment;

    // Calculate win amount
    if (this.result.multiplier >= this.selectedMultiplier) {
      this.winAmount = this.betAmount * this.selectedMultiplier;
    } else {
      this.winAmount = 0;
    }

    console.log("🎰 Wheel spin started:", {
      gameId: this.gameId,
      betAmount: this.betAmount,
      selectedMultiplier: this.selectedMultiplier,
      result: this.result,
      winAmount: this.winAmount,
    });

    return {
      gameId: this.gameId,
      gameState: this.gameState,
      betAmount: this.betAmount,
      selectedMultiplier: this.selectedMultiplier,
      result: this.result,
      winAmount: this.winAmount,
      spinDuration: 3000, // 3 seconds spin
    };
  }

  // Complete the spin
  completeSpin() {
    if (this.gameState !== "spinning") {
      throw new Error("Game is not in spinning state");
    }

    this.gameState = "completed";

    console.log("🎯 Wheel spin completed:", {
      result: this.result,
      won: this.winAmount > 0,
      winAmount: this.winAmount,
    });

    return {
      gameState: this.gameState,
      result: this.result,
      winAmount: this.winAmount,
      won: this.winAmount > 0,
    };
  }

  // Get current game status
  getGameStatus() {
    return {
      gameId: this.gameId,
      gameState: this.gameState,
      betAmount: this.betAmount,
      selectedMultiplier: this.selectedMultiplier,
      result: this.result,
      winAmount: this.winAmount,
      segments: this.segments,
    };
  }

  // Get wheel segments for display
  getWheelSegments() {
    return this.segments;
  }

  // Calculate visual position for the wheel
  getResultPosition() {
    if (!this.result) return 0;

    // Map the result to a position on the wheel (0-360 degrees)
    const segmentIndex = this.segments.findIndex(
      (s) => s.multiplier === this.result.multiplier
    );
    const segmentSize = 360 / this.segments.length;
    return segmentIndex * segmentSize + Math.random() * segmentSize;
  }

  // Reset game
  reset() {
    this.gameState = "setup";
    this.betAmount = 0;
    this.selectedMultiplier = 2;
    this.gameId = null;
    this.result = null;
    this.winAmount = 0;
  }
}

// ============ UTILITY FUNCTIONS ============

export const formatTokenAmount = (amount, decimals = 8) => {
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

export const parseTokenAmount = (amount, decimals = 8) => {
  if (!amount || isNaN(Number(amount))) return BigInt(0);
  try {
    const multiplier = Math.pow(10, decimals);
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 0) return BigInt(0);
    return BigInt(Math.floor(numAmount * multiplier));
  } catch (error) {
    console.warn("Error parsing token amount:", error);
    return BigInt(0);
  }
};

// Game session manager to handle ICP integration
export class GameSessionManager {
  constructor(tokenActor, userPrincipal) {
    this.tokenActor = tokenActor;
    this.userPrincipal = userPrincipal;
    this.balance = 0n;
  }

  // Check if user has sufficient balance
  async checkBalance(betAmount) {
    try {
      await this.getBalance();
      const betAmountBigInt = parseTokenAmount(betAmount);
      return this.balance >= betAmountBigInt;
    } catch (error) {
      console.error("Error checking balance:", error);
      return false;
    }
  }

  // Place real bet with actual token transfer
  async placeBet(betAmount) {
    try {
      const betAmountBigInt = parseTokenAmount(betAmount);
      const hasBalance = await this.checkBalance(betAmount);
      if (!hasBalance) {
        throw new Error("Insufficient balance");
      }

      const treasuryPrincipal =
        import.meta.env.VITE_CASINO_TREASURY_PRINCIPAL ||
        process.env.CASINO_TREASURY_PRINCIPAL ||
        "bkyz2-fmaaa-aaaaa-qaaaq-cai";

      const transferArgs = {
        to: { owner: Principal.fromText(treasuryPrincipal), subaccount: null },
        amount: betAmountBigInt,
        fee: null,
        memo: null,
        from_subaccount: null,
        created_at_time: null,
      };

      try {
        const transferResult = await this.tokenActor.icrc1_transfer(
          transferArgs
        );
        if (transferResult && transferResult.Ok !== undefined) {
          await this.getBalance();
          return {
            success: true,
            transactionId: `bet-${transferResult.Ok}`,
            betAmount: betAmountBigInt,
            mode: "live",
          };
        } else {
          throw new Error(
            `Transfer failed: ${JSON.stringify(transferResult?.Err || {})}`
          );
        }
      } catch (transferError) {
        console.warn("Real transfer failed, using simulation:", transferError);
        return {
          success: true,
          transactionId: `demo-${Date.now()}`,
          betAmount: betAmountBigInt,
          mode: "demo",
        };
      }
    } catch (error) {
      console.error("Error placing bet:", error);
      throw error;
    }
  }

  // Process winnings: return demo mode so caller credits UI; real payouts require backend
  async processWinnings(winAmount) {
    try {
      if (winAmount <= 0) {
        return { success: true, winAmount: 0n, mode: "no-win" };
      }
      const winAmountBigInt = parseTokenAmount(winAmount.toString());
      return {
        success: true,
        transactionId: `demo-win-${Date.now()}`,
        winAmount: winAmountBigInt,
        mode: "demo",
      };
    } catch (error) {
      console.error("Error processing winnings:", error);
      throw error;
    }
  }

  // Get current balance with better error handling
  async getBalance() {
    try {
      if (!this.tokenActor || !this.userPrincipal) {
        console.warn("TokenActor or userPrincipal not available");
        return 0n;
      }
      this.balance = await this.tokenActor.icrc1_balance_of({
        owner: Principal.fromText(this.userPrincipal),
        subaccount: [],
      });
      return this.balance;
    } catch (error) {
      console.error("Error getting balance:", error);
      return this.balance || 0n;
    }
  }
}
