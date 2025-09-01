import { CASINO_CANISTER_ID, IC_HOST } from '@/config/ic';
import { getCasinoActor as getICPCasinoActor } from '@/lib/ic/icpActors';

export const getCasinoActor = async (identity = null) => {
  if (!CASINO_CANISTER_ID) throw new Error('CASINO_CANISTER_ID is not set');
  
  // Identity is optional - functions can work without wallet connection
  return getICPCasinoActor(identity);
};


