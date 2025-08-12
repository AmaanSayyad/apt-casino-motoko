// Fully Integrated Mines Game with Proper Backend Connection
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  Button,
  Alert,
  Snackbar,
  CircularProgress,
  TextField,
  Grid,
  Paper,
  Chip,
} from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaBomb,
  FaTrophy,
  FaCoins,
  FaGem,
  FaPlay,
  FaDollarSign,
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

// Dark theme for casino styling
const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#FFD700" },
    secondary: { main: "#FF6B35" },
    background: { default: "#0a0a0a", paper: "#1a1a1a" },
  },
});

// Constants
const GRID_SIZE = 25; // 5x5 grid
const MIN_MINES = 1;
const MAX_MINES = 24;
const APTC_DECIMALS = 8;

// Utility functions
const formatTokenAmount = (amount, decimals = APTC_DECIMALS) => {
  if (!amount) return "0.00";
  const divisor = Math.pow(10, decimals);
  return (Number(amount) / divisor).toFixed(2);
};

const parseTokenAmount = (amount, decimals = APTC_DECIMALS) => {
  if (!amount) return BigInt(0);
  const multiplier = Math.pow(10, decimals);
  return BigInt(Math.floor(Number(amount) * multiplier));
};

const FullyIntegratedMinesGame = () => {
  const { isConnected, principal, identity } = useNFID();

  // Actors
  const [minesActor, setMinesActor] = useState(null);
  const [tokenActor, setTokenActor] = useState(null);

  // Game state
  const [activeGame, setActiveGame] = useState(null);
  const [gameHistory, setGameHistory] = useState([]);
  const [userBalance, setUserBalance] = useState(BigInt(0));
  const [gameStats, setGameStats] = useState(null);

  // UI state
  const [betAmount, setBetAmount] = useState("1.0");
  const [mineCount, setMineCount] = useState(5);
  const [gameGrid, setGameGrid] = useState(Array(GRID_SIZE).fill("hidden"));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  // Initialize actors when wallet connects
  useEffect(() => {
    const initializeActors = async () => {
      if (!isConnected || !identity) return;

      try {
        console.log("🎮 Initializing Mines and Token actors...");

        const minesActorInstance = await createMinesActor(identity);
        const tokenActorInstance = await createAPTCTokenActor(identity);

        setMinesActor(minesActorInstance);
        setTokenActor(tokenActorInstance);

        console.log("✅ Actors initialized successfully");
      } catch (err) {
        console.error("❌ Failed to initialize actors:", err);
        setError(`Failed to connect to game: ${err.message}`);
      }
    };

    initializeActors();
  }, [isConnected, identity]);

  // Fetch user data when actors are ready
  useEffect(() => {
    const fetchUserData = async () => {
      if (!minesActor || !tokenActor || !principal) return;

      try {
        setLoading(true);

        // Fetch balance
        const balance = await tokenActor.icrc1_balance_of({
          owner: Principal.fromText(principal),
          subaccount: [],
        });
        setUserBalance(balance);

        // Fetch active game
        const active = await minesActor.getActiveGame(
          Principal.fromText(principal)
        );
        if (active && active.length > 0) {
          setActiveGame(active[0]);
          updateGridFromGame(active[0]);
        }

        // Fetch game history
        const history = await minesActor.getGameHistory(
          Principal.fromText(principal),
          [10]
        );
        setGameHistory(history);

        // Fetch game stats
        const stats = await minesActor.getGameStats();
        setGameStats(stats);
      } catch (err) {
        console.error("❌ Failed to fetch user data:", err);
        setError(`Failed to load game data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [minesActor, tokenActor, principal]);

  // Update grid from game state
  const updateGridFromGame = useCallback((gameSession) => {
    const newGrid = Array(GRID_SIZE).fill("hidden");

    // Mark revealed cells
    if (gameSession.revealedCells) {
      gameSession.revealedCells.forEach((cellIndex) => {
        const index = Number(cellIndex);
        if (index >= 0 && index < GRID_SIZE) {
          newGrid[index] = "safe";
        }
      });
    }

    // Mark mines if game is over
    if (gameSession.gameState.Lost || gameSession.gameState.Won) {
      if (gameSession.minePositions) {
        gameSession.minePositions.forEach((mineIndex) => {
          const index = Number(mineIndex);
          if (index >= 0 && index < GRID_SIZE) {
            newGrid[index] = "mine";
          }
        });
      }
    }

    setGameGrid(newGrid);
  }, []);

  // Show notification
  const showNotification = useCallback((message, severity = "info") => {
    setNotification({
      open: true,
      message,
      severity,
    });
  }, []);

  // Start new game
  const startGame = useCallback(async () => {
    if (!minesActor || !tokenActor || !principal) {
      showNotification("Please connect your wallet first", "error");
      return;
    }

    if (activeGame && activeGame.gameState.InProgress) {
      showNotification("You already have an active game", "warning");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const betAmountTokens = parseTokenAmount(betAmount);

      // Check balance
      if (userBalance < betAmountTokens) {
        throw new Error(
          `Insufficient balance. You have ${formatTokenAmount(
            userBalance
          )} APTC but need ${betAmount} APTC`
        );
      }

      console.log("🎮 Starting game with:", {
        betAmount: betAmountTokens.toString(),
        mineCount,
        principal,
      });

      // Get required approval amount
      const requiredApproval = await minesActor.getRequiredApprovalAmount(
        betAmountTokens
      );

      // Approve tokens
      console.log("🔑 Approving tokens...");
      const approveResult = await tokenActor.icrc2_approve({
        from_subaccount: [],
        spender: {
          owner: Principal.fromText(CANISTER_IDS.mines),
          subaccount: [],
        },
        amount: requiredApproval,
        expected_allowance: [],
        expires_at: [],
        fee: [],
        memo: [],
        created_at_time: [],
      });

      if ("Err" in approveResult) {
        throw new Error(
          `Token approval failed: ${JSON.stringify(approveResult.Err)}`
        );
      }

      console.log("✅ Tokens approved, starting game...");

      // Start the game
      const gameResult = await minesActor.startGame(betAmountTokens, mineCount);

      if ("Err" in gameResult) {
        const errorType = Object.keys(gameResult.Err)[0];
        const errorMessage = gameResult.Err[errorType] || errorType;
        throw new Error(`Failed to start game: ${errorMessage}`);
      }

      const newGame = gameResult.Ok;
      setActiveGame(newGame);
      updateGridFromGame(newGame);

      // Update balance
      const newBalance = await tokenActor.icrc1_balance_of({
        owner: Principal.fromText(principal),
        subaccount: [],
      });
      setUserBalance(newBalance);

      showNotification(
        "Game started successfully! Click tiles to reveal.",
        "success"
      );
    } catch (err) {
      console.error("❌ Failed to start game:", err);
      setError(err.message);
      showNotification(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [
    minesActor,
    tokenActor,
    principal,
    betAmount,
    mineCount,
    activeGame,
    userBalance,
    showNotification,
    updateGridFromGame,
  ]);

  // Reveal cell
  const revealCell = useCallback(
    async (cellIndex) => {
      if (!minesActor || !activeGame || !activeGame.gameState.InProgress) {
        return;
      }

      if (gameGrid[cellIndex] !== "hidden") {
        return; // Cell already revealed
      }

      try {
        setLoading(true);

        console.log("🎲 Revealing cell:", cellIndex);
        const result = await minesActor.revealCell(cellIndex);

        if ("Err" in result) {
          const errorType = Object.keys(result.Err)[0];
          const errorMessage = result.Err[errorType] || errorType;
          throw new Error(`Failed to reveal cell: ${errorMessage}`);
        }

        const updatedGame = result.Ok;
        setActiveGame(updatedGame);
        updateGridFromGame(updatedGame);

        // Check if game ended
        if (updatedGame.gameState.Lost) {
          showNotification("💥 You hit a mine! Game over.", "error");
          // Show confetti for dramatic effect
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ["#ff0000", "#ff6b35"],
          });
        } else if (updatedGame.gameState.Won) {
          showNotification("🎉 Congratulations! You won!", "success");
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
          });
        } else {
          showNotification(
            `💎 Safe! Multiplier: ${Number(updatedGame.multiplier).toFixed(
              2
            )}x`,
            "success"
          );
        }

        // Update balance
        const newBalance = await tokenActor.icrc1_balance_of({
          owner: Principal.fromText(principal),
          subaccount: [],
        });
        setUserBalance(newBalance);
      } catch (err) {
        console.error("❌ Failed to reveal cell:", err);
        showNotification(err.message, "error");
      } finally {
        setLoading(false);
      }
    },
    [
      minesActor,
      activeGame,
      gameGrid,
      showNotification,
      updateGridFromGame,
      tokenActor,
      principal,
    ]
  );

  // Cash out
  const cashOut = useCallback(async () => {
    if (!minesActor || !activeGame || !activeGame.gameState.InProgress) {
      return;
    }

    try {
      setLoading(true);

      console.log("💰 Cashing out...");
      const result = await minesActor.cashOut();

      if ("Err" in result) {
        const errorType = Object.keys(result.Err)[0];
        const errorMessage = result.Err[errorType] || errorType;
        throw new Error(`Failed to cash out: ${errorMessage}`);
      }

      const gameResult = result.Ok;
      const winAmount = formatTokenAmount(gameResult.winAmount);

      setActiveGame(null);
      setGameGrid(Array(GRID_SIZE).fill("hidden"));

      showNotification(`🎉 Cashed out ${winAmount} APTC!`, "success");

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      // Update balance and history
      const newBalance = await tokenActor.icrc1_balance_of({
        owner: Principal.fromText(principal),
        subaccount: [],
      });
      setUserBalance(newBalance);

      const history = await minesActor.getGameHistory(
        Principal.fromText(principal),
        [10]
      );
      setGameHistory(history);
    } catch (err) {
      console.error("❌ Failed to cash out:", err);
      showNotification(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [minesActor, activeGame, showNotification, tokenActor, principal]);

  // Render cell
  const renderCell = (index) => {
    const cellState = gameGrid[index];
    const isRevealed = cellState !== "hidden";
    const isMine = cellState === "mine";
    const isSafe = cellState === "safe";

    return (
      <motion.div
        key={index}
        whileHover={{ scale: isRevealed ? 1 : 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button
          variant="outlined"
          onClick={() => revealCell(index)}
          disabled={loading || isRevealed || !activeGame?.gameState.InProgress}
          sx={{
            width: 60,
            height: 60,
            minWidth: 60,
            borderRadius: 2,
            fontSize: "1.5rem",
            backgroundColor: isRevealed
              ? isMine
                ? "#d32f2f"
                : "#2e7d32"
              : "#2a2a2a",
            color: isRevealed ? "#fff" : "#888",
            border: `2px solid ${
              isRevealed ? (isMine ? "#f44336" : "#4caf50") : "#555"
            }`,
            "&:hover": {
              backgroundColor: isRevealed ? undefined : "#3a3a3a",
              borderColor: isRevealed ? undefined : "#FFD700",
            },
            "&:disabled": {
              opacity: 0.7,
            },
          }}
        >
          {isMine && <FaBomb />}
          {isSafe && <FaGem />}
          {!isRevealed && "?"}
        </Button>
      </motion.div>
    );
  };

  if (!isConnected) {
    return (
      <ThemeProvider theme={darkTheme}>
        <Box sx={{ textAlign: "center", p: 4 }}>
          <Typography variant="h5" gutterBottom>
            Connect Your Wallet
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Please connect your wallet to play Mines
          </Typography>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <Box sx={{ p: 3, minHeight: "100vh", backgroundColor: "#0a0a0a" }}>
        <Typography
          variant="h3"
          gutterBottom
          sx={{ textAlign: "center", color: "#FFD700", mb: 4 }}
        >
          💎 Mines Game
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Processing...</Typography>
          </Box>
        )}

        <Grid container spacing={4}>
          {/* Game Controls */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, backgroundColor: "#1a1a1a" }}>
              <Typography variant="h6" gutterBottom>
                Game Controls
              </Typography>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Balance: {formatTokenAmount(userBalance)} APTC
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <TextField
                  label="Bet Amount (APTC)"
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  disabled={loading || activeGame?.gameState.InProgress}
                  fullWidth
                  inputProps={{ min: 0.01, step: 0.01 }}
                  sx={{ mb: 2 }}
                />

                <TextField
                  label="Number of Mines"
                  type="number"
                  value={mineCount}
                  onChange={(e) => setMineCount(parseInt(e.target.value) || 1)}
                  disabled={loading || activeGame?.gameState.InProgress}
                  fullWidth
                  inputProps={{ min: MIN_MINES, max: MAX_MINES }}
                />
              </Box>

              {!activeGame?.gameState.InProgress ? (
                <Button
                  variant="contained"
                  onClick={startGame}
                  disabled={loading}
                  startIcon={<FaPlay />}
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  Start Game
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={cashOut}
                  disabled={loading}
                  startIcon={<FaDollarSign />}
                  fullWidth
                  sx={{ mb: 2, backgroundColor: "#4caf50" }}
                >
                  Cash Out ({formatTokenAmount(activeGame.potentialWin)} APTC)
                </Button>
              )}

              {activeGame && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Current Game
                  </Typography>
                  <Chip
                    label={`Bet: ${formatTokenAmount(
                      activeGame.betAmount
                    )} APTC`}
                    sx={{ mr: 1, mb: 1 }}
                  />
                  <Chip
                    label={`Mines: ${Number(activeGame.mineCount)}`}
                    sx={{ mr: 1, mb: 1 }}
                  />
                  <Chip
                    label={`Multiplier: ${Number(activeGame.multiplier).toFixed(
                      2
                    )}x`}
                    sx={{ mr: 1, mb: 1 }}
                  />
                  <Chip
                    label={`Revealed: ${activeGame.revealedCells.length}`}
                    sx={{ mr: 1, mb: 1 }}
                  />
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Game Grid */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, backgroundColor: "#1a1a1a" }}>
              <Typography variant="h6" gutterBottom>
                Game Board
              </Typography>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(5, 1fr)",
                  gap: 1,
                  maxWidth: 400,
                  margin: "0 auto",
                }}
              >
                {Array.from({ length: GRID_SIZE }, (_, index) =>
                  renderCell(index)
                )}
              </Box>

              {!activeGame && (
                <Box sx={{ textAlign: "center", mt: 4 }}>
                  <Typography variant="body1" color="textSecondary">
                    Configure your bet and start a new game!
                  </Typography>
                </Box>
              )}
            </Paper>

            {/* Game History */}
            {gameHistory.length > 0 && (
              <Paper sx={{ p: 3, backgroundColor: "#1a1a1a", mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Recent Games
                </Typography>
                <Box sx={{ maxHeight: 200, overflowY: "auto" }}>
                  {gameHistory.slice(0, 5).map((game, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        p: 1,
                        borderBottom: "1px solid #333",
                      }}
                    >
                      <Typography variant="body2">
                        Game #{Number(game.gameId)} - {Number(game.mineCount)}{" "}
                        mines
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color:
                            Number(game.winAmount) > 0 ? "#4caf50" : "#f44336",
                        }}
                      >
                        {Number(game.winAmount) > 0 ? "+" : ""}
                        {formatTokenAmount(game.winAmount)} APTC
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Paper>
            )}
          </Grid>
        </Grid>

        {/* Notification snackbar */}
        <Snackbar
          open={notification.open}
          autoHideDuration={4000}
          onClose={() => setNotification({ ...notification, open: false })}
        >
          <Alert
            severity={notification.severity}
            onClose={() => setNotification({ ...notification, open: false })}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
};

export default FullyIntegratedMinesGame;
