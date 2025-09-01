// Candid IDL factory for casino_backend
export const idlFactory = ({ IDL }) => {
  return IDL.Service({
    get_balance_of: IDL.Func([IDL.Principal], [IDL.Nat], ['query']),
    deposit: IDL.Func([IDL.Nat], [], []),
    withdraw_all: IDL.Func([], [IDL.Nat], []),
    withdraw: IDL.Func([IDL.Nat], [IDL.Nat], []),
    random_blob: IDL.Func([], [IDL.Vec(IDL.Nat8)], []),
    random_nat: IDL.Func([IDL.Nat], [IDL.Nat], []),
    play_roulette: IDL.Func([], [IDL.Nat], []),
    play_plinko: IDL.Func([IDL.Nat], [IDL.Nat], []),
    play_wheel: IDL.Func([IDL.Nat], [IDL.Nat], []),
    start_mines: IDL.Func([], [IDL.Vec(IDL.Nat8)], []),
    mines_is_safe: IDL.Func([IDL.Vec(IDL.Nat8), IDL.Nat, IDL.Nat, IDL.Nat], [IDL.Bool], []),
    send_aptc_to_user: IDL.Func([IDL.Principal, IDL.Nat], [], []),
    mint_aptc_to: IDL.Func([IDL.Principal, IDL.Nat], [], []),
    withdraw_balance_to: IDL.Func([IDL.Principal], [IDL.Nat], []),
    withdraw_to: IDL.Func([IDL.Principal, IDL.Nat], [IDL.Nat], []),
    withdraw_mint_to: IDL.Func([IDL.Principal], [IDL.Nat], []),
    request_deposit: IDL.Func([IDL.Nat], [IDL.Nat, IDL.Text], []),
    check_deposit_completion: IDL.Func([IDL.Nat], [IDL.Bool, IDL.Nat], []),
  });
};


