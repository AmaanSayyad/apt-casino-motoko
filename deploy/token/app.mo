import Nat "mo:base/Nat";
import Nat8 "mo:base/Nat8";
import Principal "mo:base/Principal";
import HashMap "mo:base/HashMap";
import Hash "mo:base/Hash";
import Nat32 "mo:base/Nat32";
import Int "mo:base/Int";
import Nat64 "mo:base/Nat64";
import Blob "mo:base/Blob";
import Iter "mo:base/Iter";

actor {
	let principalHash = func (p : Principal) : Hash.Hash {
		var acc : Nat32 = 2166136261;
		let C : Nat32 = Nat32.fromNat(16777619);
		for (b in Principal.toBlob(p).vals()) {
			let v : Nat32 = Nat32.fromNat(Nat8.toNat(b));
			acc := acc +% v;
			acc := acc *% C;
		};
		acc
	};

	type Account = {
		owner : Principal;
		subaccount : ?Blob;
	};

	// ICRC-1/2 common and error types
	type Value = {
		#Nat : Nat;
		#Int : Int;
		#Text : Text;
		#Blob : Blob;
	};
	type TransferError = {
		#BadFee : { expected_fee : Nat };
		#InsufficientFunds : { balance : Nat };
		#TooOld : {};
		#CreatedInFuture : { ledger_time : Nat64 };
		#TemporarilyUnavailable : {};
		#Duplicate : { duplicate_of : Nat };
		#GenericError : { error_code : Nat; message : Text };
	};
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

	stable var balancesEntries : [(Principal, Nat)] = [];
	stable var allowancesEntries : [((Principal, Principal), Nat)] = [];
	var balances : HashMap.HashMap<Principal, Nat> = HashMap.HashMap(64, Principal.equal, principalHash);
	var allowances : HashMap.HashMap<(Principal, Principal), Nat> = HashMap.HashMap(64, func (a : (Principal, Principal), b : (Principal, Principal)) : Bool { a == b }, func (x : (Principal, Principal)) : Hash.Hash { principalHash(x.0) +% principalHash(x.1) });

	stable var symbol_ : Text = "APTC";
	stable var name_ : Text = "Test APTC";
	stable var decimals_ : Nat = 8;
	stable var fee_ : Nat = 10000;

	stable var minter : ?Principal = null;

	system func preupgrade() {
		balancesEntries := Iter.toArray(balances.entries());
		allowancesEntries := Iter.toArray(allowances.entries());
	};
	system func postupgrade() {
		balances := HashMap.HashMap(64, Principal.equal, principalHash);
		for ((p, n) in balancesEntries.vals()) { balances.put(p, n); };
		allowances := HashMap.HashMap(64, func (a : (Principal, Principal), b : (Principal, Principal)) : Bool { a == b }, func (x : (Principal, Principal)) : Hash.Hash { principalHash(x.0) +% principalHash(x.1) });
		for ((k, n) in allowancesEntries.vals()) { allowances.put(k, n); };
	};

	public shared ({caller}) func set_minter(p : Principal) : async () { minter := ?p };

	public shared ({caller}) func mint_to(to : Principal, amount : Nat) : async () {
		switch (minter) { case (?m) { assert caller == m }; case null { assert false }; };
		let cur = switch (balances.get(to)) { case (?n) n; case null 0 };
		balances.put(to, cur + amount);
	};

	public query func icrc1_symbol() : async Text { symbol_ };
	public query func icrc1_name() : async Text { name_ };
	public query func icrc1_decimals() : async Nat { decimals_ };
	public query func icrc1_fee() : async Nat { fee_ };
	public query func icrc1_metadata() : async [(Text, Value)] {
		[
			("icrc1:symbol", #Text symbol_),
			("icrc1:name", #Text name_),
			("icrc1:decimals", #Nat decimals_),
			("icrc1:fee", #Nat fee_)
		]
	};
	public query func icrc1_supported_standards() : async [{ name : Text; url : Text }] {
		[
			{ name = "ICRC-1"; url = "https://github.com/dfinity/ICRC-1" },
			{ name = "ICRC-2"; url = "https://github.com/dfinity/ICRC-2" }
		]
	};
	public query func icrc1_balance_of(a : Account) : async Nat {
		switch (balances.get(a.owner)) { case (?n) n; case null 0 };
	};

	public shared ({caller}) func icrc1_transfer(args : {
		from_subaccount : ?Blob;
		to : Account;
		amount : Nat;
		fee : ?Nat;
		memo : ?Blob;
		created_at_time : ?Nat64;
	}) : async { #Ok : Nat; #Err : TransferError } {
		let fromOwner = caller;
		let appliedFee = switch (args.fee) { case (null) fee_; case (?f) { if (f != fee_) { return #Err(#BadFee{ expected_fee = fee_ }) } else { f } } };
		let total = args.amount + appliedFee;
		let fromBal = switch (balances.get(fromOwner)) { case (?n) n; case null 0 };
		if (fromBal < total) { return #Err(#InsufficientFunds{ balance = fromBal }) };
		balances.put(fromOwner, fromBal - total);
		let toBal = switch (balances.get(args.to.owner)) { case (?n) n; case null 0 };
		balances.put(args.to.owner, toBal + args.amount);
		#Ok(0);
	};

	public shared ({caller}) func icrc2_approve(args : {
		from_subaccount : ?Blob;
		spender : Principal;
		amount : Nat;
		expected_allowance : ?Nat;
		expires_at : ?Nat64;
		fee : ?Nat;
		memo : ?Blob;
		created_at_time : ?Nat64;
	}) : async { #Ok : Nat; #Err : TransferFromError } {
		let owner = caller;
		allowances.put((owner, args.spender), args.amount);
		#Ok(0);
	};

	public shared ({caller}) func icrc2_transfer_from(args : {
		from : Account;
		to : Account;
		amount : Nat;
		fee : ?Nat;
		memo : ?Blob;
		created_at_time : ?Nat64;
		spender_subaccount : ?Blob;
	}) : async { #Ok : Nat; #Err : TransferFromError } {
		let key = (args.from.owner, caller);
		let appliedFee = switch (args.fee) { case (null) fee_; case (?f) { if (f != fee_) { return #Err(#BadFee{ expected_fee = fee_ }) } else { f } } };
		let total = args.amount + appliedFee;
		let allowance = switch (allowances.get(key)) { case (?n) n; case null 0 };
		if (allowance < total) { return #Err(#InsufficientAllowance{ allowance = allowance }) };
		let fromBal = switch (balances.get(args.from.owner)) { case (?n) n; case null 0 };
		if (fromBal < total) { return #Err(#InsufficientFunds{ balance = fromBal }) };
		balances.put(args.from.owner, fromBal - total);
		let toBal = switch (balances.get(args.to.owner)) { case (?n) n; case null 0 };
		balances.put(args.to.owner, toBal + args.amount);
		allowances.put(key, allowance - total);
		#Ok(0);
	};
}

