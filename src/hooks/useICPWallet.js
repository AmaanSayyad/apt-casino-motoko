'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthClient } from '@dfinity/auth-client';
import { HttpAgent } from '@dfinity/agent';
import { createActor } from '@/lib/ic/icpActors';

export default function useICPWallet({ whitelist = [], host = 'https://ic0.app' } = {}) {
  const [connected, setConnected] = useState(false);
  const [principalId, setPrincipalId] = useState(null);
  const [actor, setActor] = useState(null);
  const [authClient, setAuthClient] = useState(null);
  const [error, setError] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Check if Internet Identity is available
  const available = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return true; // AuthClient handles the availability check
  }, []);

  const connect = useCallback(async () => {
    if (!available) {
      throw new Error('Internet Identity is not available');
    }

    try {
      setIsConnecting(true);
      setError(null);

      // Create or reuse AuthClient locally to avoid null during first use
      const client = authClient ?? (await AuthClient.create());
      if (!authClient) setAuthClient(client);

      // Check if already authenticated
      const isAuthenticated = await client.isAuthenticated();
      if (isAuthenticated) {
        // User is already authenticated, get the identity
        const identity = client.getIdentity();
        const principal = identity.getPrincipal();
        const principalString = principal.toText();
        
        setPrincipalId(principalString);
        setConnected(true);
        
        // Dispatch connection event
        window.dispatchEvent(new Event('icp-connected'));
        
        return { principal: principalString, identity, actor: null };
      }

      // Request login
      await client.login({
        identityProvider: host && host.includes('localhost')
          ? `http://rdmx6-jaaaa-aaaaa-aaadq-cai.localhost:4943`
          : 'https://identity.ic0.app',
        delegationTargets: Array.isArray(whitelist) && whitelist.length > 0 ? whitelist : undefined,
        onSuccess: () => {
          const identity = client.getIdentity();
          const principal = identity.getPrincipal();
          const principalString = principal.toText();
          
          setPrincipalId(principalString);
          setConnected(true);
          
          // Dispatch connection event
          window.dispatchEvent(new Event('icp-connected'));
        }
      });

    } catch (e) {
      console.error('Failed to connect to Internet Identity:', e);
      setError(e?.message || 'Failed to connect to Internet Identity');
      setConnected(false);
      throw e;
    } finally {
      setIsConnecting(false);
    }
  }, [available, host, authClient]);

  const disconnect = useCallback(async () => {
    try {
      if (authClient) {
        await authClient.logout();
      }
      
      // Reset state
      setConnected(false);
      setPrincipalId(null);
      setActor(null);
      setError(null);
      
      // Dispatch disconnection event
      window.dispatchEvent(new Event('icp-disconnected'));
    } catch (e) {
      console.error('Error during disconnect:', e);
    }
  }, [authClient]);

  // Check for existing session on mount
  useEffect(() => {
    if (!available) return;

    const checkExistingSession = async () => {
      try {
        // Create or reuse AuthClient locally to avoid null during first use
        const client = authClient ?? (await AuthClient.create());
        if (!authClient) setAuthClient(client);

        // Check if already authenticated
        const isAuthenticated = await client.isAuthenticated();
        if (isAuthenticated) {
          const identity = client.getIdentity();
          const principal = identity.getPrincipal();
          const principalString = principal.toText();
          
          setPrincipalId(principalString);
          setConnected(true);
        }
      } catch (e) {
        console.error('Error checking existing session:', e);
      }
    };

    checkExistingSession();
  }, [available, authClient]);

  const data = useMemo(() => ({
    connected,
    principalId,
    identity: authClient?.getIdentity(),
    agent: authClient?.getIdentity() ? new HttpAgent({ 
      identity: authClient.getIdentity(), 
      host: host 
    }) : null,
    available,
    error,
    isConnecting,
  }), [connected, principalId, authClient, host, available, error, isConnecting]);

  return {
    ...data,
    connect,
    disconnect,
  };
}
