import Nat "mo:base/Nat";
import Nat8 "mo:base/Nat8";
import HashMap "mo:base/HashMap";
import Principal "mo:base/Principal";
import Blob "mo:base/Blob";
import Random "mo:base/Random";
import Int "mo:base/Int";

actor {
  // Balance map in cycles (for demo only; not production-grade)
  stable var balances : HashMap.HashMap<Principal, Nat> = HashMap.HashMap<Principal, Nat>(10, Principal.equal, Principal.hash);

  public query func get_balance_of(p : Principal) : async Nat {
    switch (balances.get(p)) {
      case (?n) n;
      case null 0;
    };
  };

  public shared ({ caller }) func deposit(amount : Nat) : async () {
    let current = switch (balances.get(caller)) { case (?n) n; case null 0 };
    balances.put(caller, current + amount);
  };

  public shared ({ caller }) func withdraw_all() : async Nat {
    let current = switch (balances.get(caller)) { case (?n) n; case null 0 };
    balances.put(caller, 0);
    return current;
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
    let set = HashMap.HashMap<Nat, Nat>(boardSize, Nat.equal, Nat.hash);
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
}


