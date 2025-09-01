'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import useICPWallet from '@/hooks/useICPWallet';

const WalletStatusContext = createContext(null);

export function WalletStatusProvider({ children }) {
  const isDev = process.env.NODE_ENV === 'development';

  const {
    connected,
    principalId,
    connect,
    disconnect,
    available,
  } = useICPWallet();

  const [devWallet, setDevWallet] = useState({
    isConnected: false,
    address: null,
    chain: null,
  });

  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isDev) return;

    const savedState = localStorage.getItem('dev-wallet-state');
    if (savedState === 'connected') {
      setDevWallet({
        isConnected: true,
        address: '0x1234...dev',
        chain: { id: 'aptos_testnet', name: 'ICP Testnet' },
      });
    }

    const handleToggle = () => {
      setDevWallet((prev) => {
        const newState = !prev.isConnected;
        localStorage.setItem(
          'dev-wallet-state',
          newState ? 'connected' : 'disconnected'
        );

        return newState
          ? {
              isConnected: true,
              address: '0x1234...dev',
              chain: { id: 'aptos_testnet', name: 'ICP Testnet' },
            }
          : {
              isConnected: false,
              address: null,
              chain: null,
            };
      });
    };

    window.addEventListener('dev-wallet-toggle', handleToggle);
    return () => {
      window.removeEventListener('dev-wallet-toggle', handleToggle);
    };
  }, [isDev]);

  const connectWallet = useCallback(async () => {
    if (isDev) {
      localStorage.setItem('dev-wallet-state', 'connected');
      setDevWallet({
        isConnected: true,
        address: 'aaaa-bbbb-cccc-dev',
        chain: { id: 'ic_testnet', name: 'IC Local/Testnet' },
      });
      return;
    }

    try {
      await connect();
    } catch (err) {
      setError('Failed to connect to ICP: ' + err.message);
    }
  }, [connect, isDev]);

  const disconnectWallet = useCallback(async () => {
    if (isDev) {
      localStorage.setItem('dev-wallet-state', 'disconnected');
      setDevWallet({
        isConnected: false,
        address: null,
        chain: null,
      });
      return;
    }

    try {
      await disconnect();
    } catch (err) {
      setError('Failed to disconnect ICP: ' + err.message);
    }
  }, [disconnect, isDev]);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  const currentStatus = isDev
    ? devWallet
    : {
        isConnected: connected,
        address: principalId,
        chain: {
          id: 'ic_testnet',
          name: 'IC Local/Testnet',
        },
        available,
      };

  useEffect(() => {
    console.log('🔌 Plug Wallet connection changed:');
    console.log('Connected:', currentStatus.isConnected);
    console.log('Address:', currentStatus.address);
    console.log('Chain:', currentStatus.chain);
  }, [currentStatus]);

  return (
    <WalletStatusContext.Provider
      value={{
        ...currentStatus,
        isDev,
        connectWallet,
        disconnectWallet,
        resetError,
        error,
      }}
    >
      {children}
    </WalletStatusContext.Provider>
  );
}

export default function useWalletStatus() {
  const context = useContext(WalletStatusContext);
  if (!context) {
    throw new Error('useWalletStatus must be used within a WalletStatusProvider');
  }
  return context;
}
