import Nat "mo:base/Nat";
import Nat8 "mo:base/Nat8";
import HashMap "mo:base/HashMap";
import Hash "mo:base/Hash";
import Nat32 "mo:base/Nat32";
import Principal "mo:base/Principal";
import Blob "mo:base/Blob";
import Random "mo:base/Random";
import Iter "mo:base/Iter";
import Time "mo:base/Time";
import Nat64 "mo:base/Nat64";
import Int "mo:base/Int";
import Text "mo:base/Text";

actor {
  // Balance map in cycles (demo only)
  let principalHash = func (p : Principal) : Hash.Hash {
    // 32-bit rolling hash; return Nat32 (Hash.Hash)
    var acc : Nat32 = 2166136261;
    let C : Nat32 = Nat32.fromNat(16777619);
    for (b in Blob.toArray(Principal.toBlob(p)).vals()) {
      let v : Nat32 = Nat32.fromNat(Nat8.toNat(b));
      acc := acc +% v;
      acc := acc *% C;
    };
    acc
  };
  var balances : HashMap.HashMap<Principal, Nat> = HashMap.HashMap<Principal, Nat>(10, Principal.equal, principalHash);

  // Persist balances across upgrades using stable entries snapshot
  stable var balancesEntries : [(Principal, Nat)] = [];
  stable var tokenCanister : ?Principal = null;
  stable var selfPrincipal : ?Principal = null;
  // Deposit tracking system to prevent conflicts
  stable var pendingDepositsEntries : [(Principal, (Nat, Nat64, Nat))] = []; // (user, (amount, timestamp, nonce))
  var pendingDeposits : HashMap.HashMap<Principal, (Nat, Nat64, Nat)> = HashMap.HashMap<Principal, (Nat, Nat64, Nat)>(10, Principal.equal, principalHash);
  stable var depositNonce : Nat = 0;
  // Deposit policy and usage tracking (rate limiting)
  stable var depositEnabled : Bool = true;
  stable var maxPerDeposit : Nat = 1_000_000_000_000; // 10_000.00000000 in 8dp default
  stable var maxDailyTotal : Nat = 10_000_000_000_000; // 100_000.00000000 in 8dp default
  stable var depositUsageEntries : [(Principal, (Nat64, Nat))] = [];
  var depositUsage : HashMap.HashMap<Principal, (Nat64, Nat)> = HashMap.HashMap<Principal, (Nat64, Nat)>(10, Principal.equal, principalHash);
  // Snapshot of casino token balance at request time to verify real transfer happened
  stable var depositSnapshotEntries : [(Principal, Nat)] = [];
  var depositSnapshots : HashMap.HashMap<Principal, Nat> = HashMap.HashMap<Principal, Nat>(10, Principal.equal, principalHash);

  system func preupgrade() {
    balancesEntries := Iter.toArray(balances.entries());
    pendingDepositsEntries := Iter.toArray(pendingDeposits.entries());
    depositUsageEntries := Iter.toArray(depositUsage.entries());
    depositSnapshotEntries := Iter.toArray(depositSnapshots.entries());
  };

  system func postupgrade() {
    // Recreate the in-memory map from the stable snapshot
    balances := HashMap.HashMap<Principal, Nat>(balancesEntries.size(), Principal.equal, principalHash);
    for ((p, n) in balancesEntries.vals()) {
      balances.put(p, n);
    };
    pendingDeposits := HashMap.HashMap<Principal, (Nat, Nat64, Nat)>(pendingDepositsEntries.size(), Principal.equal, principalHash);
    for ((p, (amount, timestamp, nonce)) in pendingDepositsEntries.vals()) {
      pendingDeposits.put(p, (amount, timestamp, nonce));
    };
    depositUsage := HashMap.HashMap<Principal, (Nat64, Nat)>(depositUsageEntries.size(), Principal.equal, principalHash);
    for ((p, info) in depositUsageEntries.vals()) {
      depositUsage.put(p, info);
    };
    depositSnapshots := HashMap.HashMap<Principal, Nat>(depositSnapshotEntries.size(), Principal.equal, principalHash);
    for ((p, n) in depositSnapshotEntries.vals()) {
      depositSnapshots.put(p, n);
    };
  };

  public query func get_balance_of(p : Principal) : async Nat {
    switch (balances.get(p)) {
      case (?n) n;
      case null 0;
    };
  };

  // ----- ICRC token wiring (minimal interface) -----
  type Account = { owner : Principal; subaccount : ?Blob };
  type Icrc1TransferArgs = {
    from_subaccount : ?Blob;
    to : Account;
    amount : Nat;
    fee : ?Nat;
    memo : ?Blob;
    created_at_time : ?Nat64;
  };
  // Standard ICRC-1 transfer error type
  type TransferError = {
    #BadFee : { expected_fee : Nat };
    #InsufficientFunds : { balance : Nat };
    #TooOld : {};
    #CreatedInFuture : { ledger_time : Nat64 };
    #TemporarilyUnavailable : {};
    #Duplicate : { duplicate_of : Nat };
    #GenericError : { error_code : Nat; message : Text };
  };
  type Icrc2TransferFromArgs = {
    from : Account;
    to : Account;
    amount : Nat;
    fee : ?Nat;
    memo : ?Blob;
    created_at_time : ?Nat64;
    spender_subaccount : ?Blob;
  };
  // ICRC-2 transfer_from error type (superset; matches commonly used ledgers)
  type TransferFromError = {
    #BadFee : { expected_fee : Nat };
    #InsufficientFunds : { balance : Nat };
    #InsufficientAllowance : { allowance : Nat };
    #TooOld : {};
    #CreatedInFuture : { ledger_time : Nat64 };
    #TemporarilyUnavailable : {};
    #Duplicate : { duplicate_of : Nat };
    #GenericError : { error_code : Nat; message : Text };
  };
  type TokenActor = actor {
    icrc1_transfer : (Icrc1TransferArgs) -> async { #Ok : Nat; #Err : TransferError };
    icrc2_transfer_from : (Icrc2TransferFromArgs) -> async { #Ok : Nat; #Err : TransferFromError };
    mint_to : (Principal, Nat) -> async ();
    icrc1_balance_of : (Account) -> async Nat
  };

  func getTokenActorOrTrap() : TokenActor {
    switch (tokenCanister) {
      case (?pid) { actor (Principal.toText(pid)) : TokenActor };
      case null { assert false; // token not configured
        actor ("aaaaa-aa") : TokenActor // unreachable
      };
    }
  };

  public shared ({ caller }) func set_token_canister(p : Principal) : async () {
    tokenCanister := ?p;
  };

  public shared ({ caller }) func set_self_principal(p : Principal) : async () {
    // Set once; ignore subsequent calls
    if (selfPrincipal == null) { selfPrincipal := ?p };
  };

  // Request deposit - creates pending deposit entry
  public shared ({ caller }) func request_deposit(amount : Nat) : async (Nat, Text) {
    if (depositEnabled) {
      let day : Nat64 = Nat64.fromIntWrap((Time.now() / 1_000_000_000) / 86_400);
      let usage = switch (depositUsage.get(caller)) { case (?u) u; case null (day, 0) };
      let currentDay = usage.0;
      let currentDaily = if (currentDay == day) usage.1 else 0;
      assert amount <= maxPerDeposit;
      assert (currentDaily + amount) <= maxDailyTotal;
    };
    
    // Generate unique nonce for this deposit
    depositNonce := depositNonce + 1;
    let timestamp = Nat64.fromIntWrap(Int.abs(Time.now()));
    
    // Return casino principal for NNS transfer and snapshot current casino token balance
    let casinoPrincipal = switch (selfPrincipal) { case (?sp) sp; case null { assert false; caller } };
    let token = getTokenActorOrTrap();
    let casinoBalanceBefore = await token.icrc1_balance_of({ owner = casinoPrincipal; subaccount = null });

    // Store pending deposit with nonce and balance snapshot
    pendingDeposits.put(caller, (amount, timestamp, depositNonce));
    depositSnapshots.put(caller, casinoBalanceBefore);
    
    (depositNonce, Principal.toText(casinoPrincipal))
  };

  // Check and process pending deposit after user completes transfer
  public shared ({ caller }) func check_deposit_completion(nonce : Nat) : async (Bool, Nat) {
    let pending = switch (pendingDeposits.get(caller)) { case (?p) p; case null return (false, 0) };
    let (expectedAmount, timestamp, expectedNonce) = pending;
    
    if (expectedNonce != nonce) {
      return (false, 0); // Nonce mismatch
    };

    // Verify transfer by checking casino token balance increased by at least expected amount
    let snapshot = switch (depositSnapshots.get(caller)) { case (?s) s; case null 0 };
    let token = getTokenActorOrTrap();
    let casinoPrincipal = switch (selfPrincipal) { case (?sp) sp; case null { assert false; caller } };
    let casinoBalanceNow = await token.icrc1_balance_of({ owner = casinoPrincipal; subaccount = null });
    if (casinoBalanceNow < snapshot or (casinoBalanceNow - snapshot) < expectedAmount) {
      return (false, 0);
    };

    let current = switch (balances.get(caller)) { case (?n) n; case null 0 };
    let newBalance = current + expectedAmount;
    balances.put(caller, newBalance);
    
    // Remove pending deposit
    pendingDeposits.delete(caller);
    depositSnapshots.delete(caller);
    
    // Update deposit usage tracking
    if (depositEnabled) {
      let day : Nat64 = Nat64.fromIntWrap((Time.now() / 1_000_000_000) / 86_400);
      let usage = switch (depositUsage.get(caller)) { case (?u) u; case null (day, 0) };
      let currentDay = usage.0;
      let currentDaily = if (currentDay == day) usage.1 else 0;
      let newDaily = if (currentDay == day) currentDaily + expectedAmount else expectedAmount;
      depositUsage.put(caller, (day, newDaily));
    };
    
    (true, newBalance)
  };

  // Legacy deposit method (kept for backward compatibility)
  public shared ({ caller }) func deposit(amount : Nat) : async () {
    if (depositEnabled) {
      let day : Nat64 = Nat64.fromIntWrap((Time.now() / 1_000_000_000) / 86_400);
      let usage = switch (depositUsage.get(caller)) { case (?u) u; case null (day, 0) };
      let currentDay = usage.0;
      let currentDaily = if (currentDay == day) usage.1 else 0;
      assert amount <= maxPerDeposit;
      assert (currentDaily + amount) <= maxDailyTotal;
      depositUsage.put(caller, (day, currentDaily + amount));
    };
    let current = switch (balances.get(caller)) { case (?n) n; case null 0 };
    balances.put(caller, current + amount);
  };

  // Approve + pull deposit (preferred)
  public shared ({ caller }) func deposit_via_approve(amount : Nat) : async () {
    let token = getTokenActorOrTrap();
    let from : Account = { owner = caller; subaccount = null };
    let toOwner = switch (selfPrincipal) { case (?sp) sp; case null { assert false; caller } };
    let to : Account = { owner = toOwner; subaccount = null };
    ignore await token.icrc2_transfer_from({
      from = from;
      to = to;
      amount = amount;
      fee = null;
      memo = null;
      created_at_time = null;
      spender_subaccount = null;
    });
    let current = switch (balances.get(caller)) { case (?n) n; case null 0 };
    balances.put(caller, current + amount);
  };

  // Admin: configure deposit policy
  public shared ({ caller }) func set_deposit_policy(enabled : Bool, maxDeposit : Nat, maxDaily : Nat) : async () {
    depositEnabled := enabled;
    maxPerDeposit := maxDeposit;
    maxDailyTotal := maxDaily;
  };

  public query func get_deposit_policy() : async (Bool, Nat, Nat) {
    (depositEnabled, maxPerDeposit, maxDailyTotal)
  };

  public query func get_deposit_usage(p : Principal) : async (Nat64, Nat) {
    switch (depositUsage.get(p)) { case (?u) u; case null (0, 0) }
  };

  public shared ({ caller }) func withdraw_all() : async Nat {
    let current = switch (balances.get(caller)) { case (?n) n; case null 0 };
    balances.put(caller, 0);
    return current;
  };

  public shared ({ caller }) func withdraw(amount : Nat) : async Nat {
    let bal = switch (balances.get(caller)) { case (?n) n; case null 0 };
    assert bal >= amount;
    let token = getTokenActorOrTrap();
    let to : Account = { owner = caller; subaccount = null };
    ignore await token.icrc1_transfer({
      from_subaccount = null;
      to = to;
      amount = amount;
      fee = null;
      memo = null;
      created_at_time = null;
    });
    balances.put(caller, bal - amount);
    return amount;
  };

  // Withdraw the caller's entire local balance to a specified principal address
  public shared ({ caller }) func withdraw_balance_to(toOwner : Principal) : async Nat {
    let current = switch (balances.get(caller)) { case (?n) n; case null 0 };
    if (current == 0) { return 0 };
    let token = getTokenActorOrTrap();
    let to : Account = { owner = toOwner; subaccount = null };
    let res = await token.icrc1_transfer({
      from_subaccount = null;
      to = to;
      amount = current;
      fee = null;
      memo = null;
      created_at_time = null;
    });
    switch (res) {
      case (#Ok _) { balances.put(caller, 0); current };
      case (#Err _) { assert false; 0 };
    }
  };

  // Withdraw an exact amount from caller's local balance to a specified principal address
  public shared ({ caller }) func withdraw_to(toOwner : Principal, amount : Nat) : async Nat {
    let bal = switch (balances.get(caller)) { case (?n) n; case null 0 };
    assert bal >= amount;
    if (amount == 0) { return 0 };
    let token = getTokenActorOrTrap();
    let to : Account = { owner = toOwner; subaccount = null };
    let res = await token.icrc1_transfer({
      from_subaccount = null;
      to = to;
      amount = amount;
      fee = null;
      memo = null;
      created_at_time = null;
    });
    switch (res) {
      case (#Ok _) {
        balances.put(caller, bal - amount);
        amount
      };
      case (#Err e) { assert false; 0 };
    }
  };

  // Mint the caller's entire local balance to a specified principal address, then zero local balance
  public shared ({ caller }) func withdraw_mint_to(toOwner : Principal) : async Nat {
    let current = switch (balances.get(caller)) { case (?n) n; case null 0 };
    if (current == 0) { return 0 };
    let token = getTokenActorOrTrap();
    await token.mint_to(toOwner, current);
    balances.put(caller, 0);
    current
  };

  // Faucet: mint test tokens to caller (backend must be token minter)
  public shared ({ caller }) func mint_to_caller(amount : Nat) : async () {
    let token = getTokenActorOrTrap();
    await token.mint_to(caller, amount);
  };

  // ----- Randomness utilities and sample game endpoints -----

  // Convert a Blob (big-endian) into a Nat
  func blobToNat(b : Blob) : Nat {
    var acc : Nat = 0;
    for (byte : Nat8 in Blob.toArray(b).vals()) {
      acc := (acc * 256) + Nat8.toNat(byte);
    };
    acc
  };

  // Returns a fresh random Blob using ICP VRF via Random.blob()
  public func random_blob() : async Blob {
    await Random.blob();
  };

  // Returns a random Nat in [0, maxExclusive)
  public func random_nat(maxExclusive : Nat) : async Nat {
    assert maxExclusive > 0;
    let b = await Random.blob();
    blobToNat(b) % maxExclusive;
  };

  // Example: Roulette spin returns number in [0, 36]
  public func play_roulette() : async Nat {
    await random_nat(37);
  };

  // Plinko: returns bin index in [0, rows]
  public func play_plinko(rows : Nat) : async Nat {
    assert rows > 0;
    var rights : Nat = 0;
    var i : Nat = 0;
    // Generate one random bit per row
    label l loop {
      if (i >= rows) break l;
      let b = await Random.blob();
      let bit = blobToNat(b) % 2;
      if (bit == 1) { rights += 1; };
      i += 1;
    };
    rights;
  };

  // Wheel: generic segments spinner, returns segment index in [0, segments)
  public func play_wheel(segments : Nat) : async Nat {
    await random_nat(segments);
  };

  // Mines: deterministic board based on a seed to allow client-side reveals without canister state
  public func start_mines() : async Blob {
    await random_blob();
  };

  // Simple linear congruential generator
  func lcg_next(state : Nat) : Nat {
    // Constants are arbitrary but co-prime; modulus is 2^128 via Nat overflow semantics
    (state * 48271 + 0x12345);
  };

  func pick_mines(seedNat : Nat, boardSize : Nat, numMines : Nat) : HashMap.HashMap<Nat, Nat> {
    let P32 : Nat = 4294967296; // 2^32
    let natHash = func (n : Nat) : Hash.Hash { Nat32.fromNat(n % P32) };
    let set = HashMap.HashMap<Nat, Nat>(boardSize, Nat.equal, natHash);
    if (boardSize == 0 or numMines == 0) return set;
    if (numMines >= boardSize) {
      var idx : Nat = 0;
      while (idx < boardSize) { set.put(idx, 1); idx += 1; };
      return set;
    };
    var state = seedNat;
    var placed : Nat = 0;
    label l while (placed < numMines) {
      state := lcg_next(state);
      let pos = state % boardSize;
      switch (set.get(pos)) {
        case (null) { set.put(pos, 1); placed += 1; };
        case (?_) { /* duplicate, continue */ };
      };
    };
    set;
  };

  public func mines_is_safe(seed : Blob, boardSize : Nat, numMines : Nat, index : Nat) : async Bool {
    assert index < boardSize;
    let seedNat = blobToNat(seed);
    let mines = pick_mines(seedNat, boardSize, numMines);
    switch (mines.get(index)) {
      case (null) true;
      case (?_) false;
    };
  };

  // ----- APTC Token Distribution -----

  // Send APTC tokens to a user's token address from the canister's treasury
  public shared ({ caller }) func send_aptc_to_user(userPrincipal : Principal, amount : Nat) : async () {
    let token = getTokenActorOrTrap();

    // Perform ICRC-1 transfer from canister account to the provided principal
    let res = await token.icrc1_transfer({
      from_subaccount = null;
      to = { owner = userPrincipal; subaccount = null };
      amount = amount;
      fee = null;
      memo = null;
      created_at_time = null;
    });

    // Handle standard ICRC-1 result type: variant { Ok : Nat; Err : TransferError }
    switch (res) {
      case (#Ok _) { () };
      case (#Err _) { assert false };
    };
  };

  // Mint new APTC tokens directly to a specified principal (backend must be token minter)
  public shared ({ caller }) func mint_aptc_to(userPrincipal : Principal, amount : Nat) : async () {
    let token = getTokenActorOrTrap();
    await token.mint_to(userPrincipal, amount);
  };
}


