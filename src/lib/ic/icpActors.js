import { HttpAgent } from '@dfinity/agent';
import { Actor, ActorSubclass } from '@dfinity/agent';
import { CASINO_CANISTER_ID, IC_HOST } from '@/config/ic';

// Cache for actors to avoid repeated creation
const actorCache = new Map(); // key: `${canisterId}@${host||''}` -> actor

/**
 * Create an ICP actor - Simplified without identity requirement
 * @param {Object} params - Parameters for actor creation
 * @param {string} params.canisterId - The canister ID
 * @param {Object} params.idlFactory - The IDL factory
 * @param {string} params.host - The IC host URL
 * @param {Object} params.identity - The user identity (optional)
 * @returns {Promise<ActorSubclass>} The created actor
 */
export const createICPActor = async ({ 
  canisterId, 
  idlFactory, 
  host = IC_HOST, 
  identity = null 
}) => {
  if (!canisterId) throw new Error('Missing canisterId');
  if (!idlFactory) throw new Error('Missing idlFactory');

  const normalizedHost = host ? host.replace('localhost', '127.0.0.1') : undefined;
  const key = `${canisterId}@${normalizedHost || ''}`;
  
  // Check cache first
  if (actorCache.has(key)) {
    return actorCache.get(key);
  }

  try {
    // Create HTTP agent - with or without identity
    const agentOptions = { host: normalizedHost };
    if (identity) {
      agentOptions.identity = identity;
    }
    
    const agent = new HttpAgent(agentOptions);
    
    // Fetch root key only when using local replica
    if (normalizedHost && (normalizedHost.includes('127.0.0.1') || normalizedHost.includes('localhost'))) {
      await agent.fetchRootKey();
    }

    // Create the actor
    const actor = Actor.createActor(idlFactory, {
      agent,
      canisterId,
    });

    // Cache the actor
    actorCache.set(key, actor);
    
    return actor;
  } catch (error) {
    console.error('Failed to create ICP actor:', error);
    
    // Check if it's a timeout or connection error
    if (error.message?.includes('timeout') || 
        error.message?.includes('network') || 
        error.message?.includes('fetch') ||
        error.message?.includes('HTTP')) {
      throw new Error('Connection timeout. Please reconnect your Internet Identity and try again.');
    } else {
      throw new Error(`Failed to create actor: ${error.message}`);
    }
  }
};

/**
 * Get the casino actor - Simplified without identity requirement
 * @param {Object} identity - The user's identity from ICP wallet (optional)
 * @returns {Promise<ActorSubclass>} The casino actor
 */
export const getCasinoActor = async (identity = null) => {
  if (!CASINO_CANISTER_ID) throw new Error('CASINO_CANISTER_ID is not set');
  
  const { idlFactory } = await import('@/ic/casino_backend/casino_backend.idl');
  
  return createICPActor({ 
    canisterId: CASINO_CANISTER_ID, 
    idlFactory, 
    host: IC_HOST,
    identity 
  });
};

/**
 * Clear the actor cache (useful for logout/disconnect)
 */
export const clearActorCache = () => {
  actorCache.clear();
};

/**
 * Get cached actor if available
 * @param {string} canisterId - The canister ID
 * @param {string} host - The IC host URL
 * @returns {ActorSubclass|null} The cached actor or null
 */
export const getCachedActor = (canisterId, host = IC_HOST) => {
  const normalizedHost = host ? host.replace('localhost', '127.0.0.1') : undefined;
  const key = `${canisterId}@${normalizedHost || ''}`;
  return actorCache.get(key) || null;
};
