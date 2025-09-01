"use client";
import React, { useEffect } from 'react';
import useICPWallet from '@/hooks/useICPWallet';
import { IC_HOST } from '@/config/ic';

export default function ICPConnectWalletButton({ 
  whitelist = [], 
  host = IC_HOST,
  onConnectionChange = null 
}) {
  const { connected, principalId, isConnecting, connect, disconnect, available, identity } = useICPWallet({ whitelist, host });

  const handleClick = async () => {
    if (connected) {
      await disconnect();
      return;
    }
    
    try {
      await connect();
      // Dispatch custom event for other components to listen to
      window.dispatchEvent(new Event('icp-connected'));
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  };

  // Notify parent component when connection state changes
  useEffect(() => {
    if (onConnectionChange) {
      onConnectionChange({ connected, principalId, identity });
    }
  }, [connected, principalId, identity, onConnectionChange]);

  if (!available) {
    return (
      <a
        href="https://internetcomputer.org/internet-identity"
        target="_blank"
        rel="noreferrer"
        className="px-3 py-2 text-sm rounded bg-blue-600/30 text-blue-200 hover:bg-blue-600/40 transition-colors"
      >
        Setup Internet Identity
      </a>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={isConnecting}
      className={`px-3 py-2 rounded font-medium transition-colors ${
        connected 
          ? 'bg-green-700/40 text-green-200 hover:bg-green-700/60' 
          : 'bg-blue-600 text-white hover:bg-blue-700'
      } ${isConnecting ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {isConnecting 
        ? 'Connecting...' 
        : connected 
          ? `${principalId?.slice(0, 8)}...` 
          : 'Connect ICP'
      }
    </button>
  );
}
