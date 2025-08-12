// APTC Configuration for APT Casino
import { Actor, HttpAgent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";

// Add BigInt serialization support globally
if (typeof BigInt !== "undefined" && !BigInt.prototype.toJSON) {
  BigInt.prototype.toJSON = function () {
    return this.toString();
  };
}

// Canister IDs - These will be set after deployment
export const CANISTER_IDS = {
  aptc_token:
    process.env.NEXT_PUBLIC_APTC_TOKEN_CANISTER_ID ||
    process.env.CANISTER_ID_APTC_TOKEN ||
    "bkyz2-fmaaa-aaaaa-qaaaq-cai",
  roulette:
    process.env.NEXT_PUBLIC_ROULETTE_CANISTER_ID ||
    process.env.CANISTER_ID_ROULETTE_GAME ||
    "bw4dl-smaaa-aaaaa-qaacq-cai",
  mines:
    process.env.NEXT_PUBLIC_MINES_CANISTER_ID ||
    process.env.CANISTER_ID_MINES_GAME ||
    "be2us-64aaa-aaaaa-qaabq-cai",
  wheel:
    process.env.NEXT_PUBLIC_WHEEL_CANISTER_ID ||
    process.env.CANISTER_ID_WHEEL_GAME ||
    "br5f7-7uaaa-aaaaa-qaaca-cai",
  casino_frontend:
    process.env.NEXT_PUBLIC_CASINO_FRONTEND_CANISTER_ID ||
    process.env.CANISTER_ID_APT_CASINO_FRONTEND ||
    "by6od-j4aaa-aaaaa-qaadq-cai",
};

// Network configuration
export const NETWORK_CONFIG = {
  local: {
    host: `http://127.0.0.1:${process.env.DFX_PORT || "4943"}`,
    agent: null,
  },
  ic: {
    host: "https://icp0.io",
    agent: null,
  },
};

// Current network (local for development, ic for production)
export const CURRENT_NETWORK =
  process.env.NODE_ENV === "production" ? "ic" : "local";

// Create HTTP Agent with retries
export const createAgent = async (identity = null) => {
  // For local development, make sure we're using the right port
  // Force using 4943 to avoid connection issues with incorrect ports like 50707
  const localHost = "http://127.0.0.1:4943";

  // Determine host based on network and environment
  const host =
    CURRENT_NETWORK === "local"
      ? localHost
      : NETWORK_CONFIG[CURRENT_NETWORK].host;

  console.log(`🌐 Creating HTTP agent for host: ${host}`);

  // Create agent with improved timeout and retry settings
  const agent = new HttpAgent({
    host,
    identity,
    // Increased timeout for all environments
    fetchOptions: {
      timeout: 60000, // 60 seconds timeout
    },
    // Disable certificate verification in development
    ...(CURRENT_NETWORK === "local" ? { verifyQuerySignatures: false } : {}),
  });

  // Set up retry logic for fetching the root key
  const fetchRootKeyWithRetry = async (maxRetries = 3, delay = 1000) => {
    let retries = 0;
    while (retries < maxRetries) {
      try {
        console.log(`� Fetching root key (attempt ${retries + 1})...`);
        await agent.fetchRootKey();
        console.log("✅ Root key fetch complete");
        return;
      } catch (err) {
        retries++;
        console.warn(
          `⚠️ Root key fetch attempt ${retries} failed:`,
          err.message
        );
        if (retries >= maxRetries) {
          console.warn(
            "⚠️ Max retries reached for fetchRootKey. Proceeding anyway."
          );
          return;
        }
        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay * retries));
      }
    }
  };

  // Fetch root key for local development with retries
  if (CURRENT_NETWORK === "local") {
    try {
      await fetchRootKeyWithRetry();
    } catch (err) {
      console.warn("⚠️ Unable to fetch root key. Check your local replica.");
      console.error(err);
      // Continue anyway - in local development this might still work
    }
  }

  return agent;
};

// APTC Token Interface
export const aptcTokenIdl = {
  idlFactory: ({ IDL }) => {
    return IDL.Service({
      icrc1_name: IDL.Func([], [IDL.Text], ["query"]),
      icrc1_symbol: IDL.Func([], [IDL.Text], ["query"]),
      icrc1_decimals: IDL.Func([], [IDL.Nat8], ["query"]),
      icrc1_fee: IDL.Func([], [IDL.Nat], ["query"]),
      icrc1_total_supply: IDL.Func([], [IDL.Nat], ["query"]),
      icrc1_balance_of: IDL.Func(
        [
          IDL.Record({
            owner: IDL.Principal,
            subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
          }),
        ],
        [IDL.Nat],
        ["query"]
      ),
      icrc2_allowance: IDL.Func(
        [
          IDL.Record({
            account: IDL.Record({
              owner: IDL.Principal,
              subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
            }),
            spender: IDL.Record({
              owner: IDL.Principal,
              subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
            }),
          }),
        ],
        [
          IDL.Record({
            allowance: IDL.Nat,
            expires_at: IDL.Opt(IDL.Nat64),
          }),
        ],
        ["query"]
      ),
      icrc2_approve: IDL.Func(
        [
          IDL.Record({
            from_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
            spender: IDL.Record({
              owner: IDL.Principal,
              subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
            }),
            amount: IDL.Nat,
            expected_allowance: IDL.Opt(IDL.Nat),
            expires_at: IDL.Opt(IDL.Nat64),
            fee: IDL.Opt(IDL.Nat),
            memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
            created_at_time: IDL.Opt(IDL.Nat64),
          }),
        ],
        [
          IDL.Variant({
            Ok: IDL.Nat,
            Err: IDL.Variant({
              InsufficientFunds: IDL.Record({ balance: IDL.Nat }),
              AllowanceChanged: IDL.Record({ current_allowance: IDL.Nat }),
              BadFee: IDL.Record({ expected_fee: IDL.Nat }),
              Expired: IDL.Record({ ledger_time: IDL.Nat64 }),
              TooOld: IDL.Null,
              CreatedInFuture: IDL.Record({ ledger_time: IDL.Nat64 }),
              Duplicate: IDL.Record({ duplicate_of: IDL.Nat }),
              TemporarilyUnavailable: IDL.Null,
              GenericError: IDL.Record({
                error_code: IDL.Nat,
                message: IDL.Text,
              }),
            }),
          }),
        ],
        []
      ),
      faucet_claim: IDL.Func(
        [],
        [IDL.Variant({ Ok: IDL.Nat, Err: IDL.Text })],
        []
      ),
      icrc1_transfer: IDL.Func(
        [
          IDL.Record({
            to: IDL.Record({
              owner: IDL.Principal,
              subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
            }),
            amount: IDL.Nat,
            fee: IDL.Opt(IDL.Nat),
            memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
            from_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
            created_at_time: IDL.Opt(IDL.Nat64),
          }),
        ],
        [IDL.Variant({ Ok: IDL.Nat, Err: IDL.Text })],
        []
      ),
    });
  },
};

// Roulette Game Interface
export const rouletteIdl = {
  idlFactory: ({ IDL }) => {
    const BetType = IDL.Variant({
      Number: IDL.Null,
      Color: IDL.Null,
      OddEven: IDL.Null,
      HighLow: IDL.Null,
      Dozen: IDL.Null,
      Column: IDL.Null,
      Split: IDL.Null,
      Street: IDL.Null,
      Corner: IDL.Null,
      Line: IDL.Null,
    });

    return IDL.Service({
      getGameInfo: IDL.Func(
        [],
        [
          IDL.Record({
            currentRound: IDL.Nat,
            minBet: IDL.Nat,
            maxBet: IDL.Nat,
            lastSpinTime: IDL.Int,
          }),
        ],
        ["query"]
      ),
      getRecentNumbers: IDL.Func([], [IDL.Vec(IDL.Nat)], ["query"]),
      getUserBalance: IDL.Func([IDL.Principal], [IDL.Nat], ["query"]),
      getCurrentBets: IDL.Func(
        [],
        [
          IDL.Vec(
            IDL.Record({
              player: IDL.Principal,
              amount: IDL.Nat,
              betType: BetType,
              betValue: IDL.Nat8,
              numbers: IDL.Vec(IDL.Nat),
              round: IDL.Nat,
              timestamp: IDL.Int,
            })
          ),
        ],
        ["query"]
      ),
      placeBet: IDL.Func(
        [BetType, IDL.Nat8, IDL.Nat, IDL.Vec(IDL.Nat)],
        [IDL.Variant({ Ok: IDL.Text, Err: IDL.Text })],
        []
      ),
      spinRoulette: IDL.Func(
        [],
        [IDL.Variant({ Ok: IDL.Text, Err: IDL.Text })],
        []
      ),
      withdraw: IDL.Func(
        [IDL.Nat],
        [IDL.Variant({ Ok: IDL.Text, Err: IDL.Text })],
        []
      ),
    });
  },
};

// Mines Game Interface
export const minesIdl = {
  idlFactory: ({ IDL }) => {
    const CellState = IDL.Variant({
      Hidden: IDL.Null,
      Revealed: IDL.Null,
      Mine: IDL.Null,
      Safe: IDL.Null,
    });

    const GameState = IDL.Variant({
      NotStarted: IDL.Null,
      InProgress: IDL.Null,
      Won: IDL.Null,
      Lost: IDL.Null,
      Cashed: IDL.Null,
    });

    const MinesGameSession = IDL.Record({
      player: IDL.Principal,
      betAmount: IDL.Nat,
      mineCount: IDL.Nat,
      gameState: GameState,
      grid: IDL.Vec(CellState),
      minePositions: IDL.Vec(IDL.Nat),
      revealedCells: IDL.Vec(IDL.Nat),
      multiplier: IDL.Float64,
      potentialWin: IDL.Nat,
      startTime: IDL.Int,
      endTime: IDL.Opt(IDL.Int),
    });

    const GameResult = IDL.Record({
      gameId: IDL.Nat,
      player: IDL.Principal,
      betAmount: IDL.Nat,
      winAmount: IDL.Nat,
      mineCount: IDL.Nat,
      revealedCells: IDL.Vec(IDL.Nat),
      minePositions: IDL.Vec(IDL.Nat),
      gameState: GameState,
      timestamp: IDL.Int,
    });

    const UserStats = IDL.Record({
      totalBets: IDL.Nat,
      totalWagered: IDL.Nat,
      totalWon: IDL.Nat,
      totalLost: IDL.Nat,
      biggestWin: IDL.Nat,
      gamesPlayed: IDL.Nat,
      lastGameTime: IDL.Int,
    });

    const MinesError = IDL.Variant({
      NotAuthorized: IDL.Null,
      GameNotFound: IDL.Null,
      GameNotInProgress: IDL.Null,
      GameAlreadyInProgress: IDL.Null,
      InvalidCellIndex: IDL.Null,
      CellAlreadyRevealed: IDL.Null,
      InsufficientBalance: IDL.Null,
      InvalidBetAmount: IDL.Null,
      InvalidMineCount: IDL.Null,
      TransferFailed: IDL.Text,
      GameNotStarted: IDL.Null,
      TooManyMines: IDL.Null,
      TooFewMines: IDL.Null,
      CooldownActive: IDL.Null,
      GameInactive: IDL.Null,
      NotInitialized: IDL.Null,
      InsufficientAllowance: IDL.Null,
    });

    return IDL.Service({
      // Game functions
      startGame: IDL.Func(
        [IDL.Nat, IDL.Nat],
        [IDL.Variant({ Ok: MinesGameSession, Err: MinesError })],
        []
      ),
      startGameWithProxy: IDL.Func(
        [IDL.Principal, IDL.Nat, IDL.Nat],
        [IDL.Variant({ Ok: MinesGameSession, Err: MinesError })],
        []
      ),
      revealCell: IDL.Func(
        [IDL.Nat],
        [IDL.Variant({ Ok: MinesGameSession, Err: MinesError })],
        []
      ),
      cashOut: IDL.Func(
        [],
        [IDL.Variant({ Ok: GameResult, Err: MinesError })],
        []
      ),

      // Query functions
      getActiveGame: IDL.Func(
        [IDL.Principal],
        [IDL.Opt(MinesGameSession)],
        ["query"]
      ),
      getMyActiveGame: IDL.Func(
        [],
        [IDL.Variant({ Ok: MinesGameSession, Err: MinesError })],
        []
      ),
      getGameHistory: IDL.Func(
        [IDL.Principal, IDL.Opt(IDL.Nat)],
        [IDL.Vec(GameResult)],
        ["query"]
      ),
      getUserStats: IDL.Func([IDL.Principal], [IDL.Opt(UserStats)], ["query"]),
      getGameStats: IDL.Func(
        [],
        [
          IDL.Record({
            totalGames: IDL.Nat,
            totalVolume: IDL.Nat,
            houseProfits: IDL.Nat,
            activeGamesCount: IDL.Nat,
          }),
        ],
        ["query"]
      ),
      getBetLimits: IDL.Func(
        [],
        [IDL.Record({ minBet: IDL.Nat, maxBet: IDL.Nat })],
        ["query"]
      ),
      isGameActive: IDL.Func([], [IDL.Bool], ["query"]),
      getMultiplierForMines: IDL.Func(
        [IDL.Nat, IDL.Nat],
        [IDL.Float64],
        ["query"]
      ),

      // Token functions
      getPlayerTokenBalance: IDL.Func([IDL.Principal], [IDL.Nat], []),
      getPlayerAllowance: IDL.Func([], [IDL.Nat], []),
      getRequiredApprovalAmount: IDL.Func([IDL.Nat], [IDL.Nat], []),
      getGameCanisterPrincipal: IDL.Func([], [IDL.Principal], ["query"]),

      // Debug functions
      whoAmI: IDL.Func([], [IDL.Principal], []),
      debugStartGameIssue: IDL.Func(
        [IDL.Principal, IDL.Nat],
        [
          IDL.Record({
            user_principal: IDL.Principal,
            user_balance: IDL.Nat,
            required_amount: IDL.Nat,
            has_allowance: IDL.Bool,
            allowance_amount: IDL.Nat,
            balance_sufficient: IDL.Bool,
            has_active_game: IDL.Bool,
            game_active: IDL.Bool,
            is_valid_bet: IDL.Bool,
          }),
        ],
        []
      ),
    });
  },
};

// Create Token Actor with retry logic
export const createAPTCTokenActor = async (identity = null, maxRetries = 3) => {
  let lastError = null;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      console.log(
        `🔄 Creating APTC token actor (attempt ${retryCount + 1})...`
      );
      const agent = await createAgent(identity);

      // Instead of dynamic import, use the direct IDL factory with static imports
      // This is more reliable in certain build environments
      const { idlFactory } = aptcTokenIdl;

      const actor = Actor.createActor(idlFactory, {
        agent,
        canisterId: CANISTER_IDS.aptc_token,
      });

      // Test the connection with a simple query
      try {
        console.log("🔍 Testing APTC token actor connection...");
        await actor.icrc1_name();
        console.log("✅ APTC token actor created successfully");
        return actor;
      } catch (testError) {
        console.warn(
          "⚠️ APTC token actor connection test failed:",
          testError.message
        );
        throw testError; // Re-throw for retry
      }
    } catch (err) {
      lastError = err;
      retryCount++;
      console.error(
        `❌ Failed to create APTC token actor (attempt ${retryCount}):`,
        err.message
      );

      if (retryCount < maxRetries) {
        // Exponential backoff: wait longer between each retry
        const delayMs = 1000 * Math.pow(2, retryCount - 1);
        console.log(`⏳ Retrying in ${delayMs / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  // If we've exhausted all retries, throw the last error
  console.error(
    `❌ Failed to create APTC token actor after ${maxRetries} attempts`
  );
  throw lastError;
};

// Create Roulette Actor
export const createRouletteActor = async (identity = null) => {
  try {
    const agent = await createAgent(identity);

    // Instead of dynamic import, use the direct IDL factory with static imports
    // This is more reliable in certain build environments
    const { idlFactory } = rouletteIdl;

    return Actor.createActor(idlFactory, {
      agent,
      canisterId: CANISTER_IDS.roulette,
    });
  } catch (err) {
    console.error("Failed to create Roulette actor:", err);
    throw err;
  }
};

// Create Mines Actor with retry logic
export const createMinesActor = async (identity = null, maxRetries = 3) => {
  let lastError = null;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      console.log(`🔄 Creating Mines actor (attempt ${retryCount + 1})...`);
      const agent = await createAgent(identity);

      // Instead of dynamic import, use the direct IDL factory with static imports
      // This is more reliable in certain build environments
      const { idlFactory } = minesIdl;

      const actor = Actor.createActor(idlFactory, {
        agent,
        canisterId: CANISTER_IDS.mines,
      });

      // Test the connection with a simple query
      try {
        // Adding a simple check to verify the actor is working
        console.log("🔍 Testing Mines actor connection...");
        // Use whoAmI which is a simple method that exists in the mines canister
        await actor.whoAmI();
        console.log("✅ Mines actor created successfully");
        return actor;
      } catch (testError) {
        console.warn(
          "⚠️ Mines actor connection test failed:",
          testError.message
        );
        throw testError; // Re-throw for retry
      }
    } catch (err) {
      lastError = err;
      retryCount++;
      console.error(
        `❌ Failed to create Mines actor (attempt ${retryCount}):`,
        err.message
      );

      if (retryCount < maxRetries) {
        // Exponential backoff: wait longer between each retry
        const delayMs = 1000 * Math.pow(2, retryCount - 1);
        console.log(`⏳ Retrying in ${delayMs / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  // If we've exhausted all retries, throw the last error
  console.error(`❌ Failed to create Mines actor after ${maxRetries} attempts`);
  throw lastError;
};

// Format token amount - Using simple Number format like Number(bet.winnings) / 100000000
export const formatTokenAmount = (amount, decimals = 8) => {
  if (!amount) return 0;
  return Number(amount) / 100000000;
};

// Parse token amount
export const parseTokenAmount = (amount, decimals = 8) => {
  if (!amount) return 0;
  return Math.floor(Number(amount) * 100000000);
};
