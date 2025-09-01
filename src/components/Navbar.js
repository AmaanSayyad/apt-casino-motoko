"use client";
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useSelector, useDispatch } from 'react-redux';
import { setBalance, setLoading, loadBalanceFromStorage } from '@/store/balanceSlice';
import ICPConnectWalletButton from "./ICPConnectWalletButton";


import { useNotification } from './NotificationSystem';
import { getCasinoActor } from '@/lib/ic/actors';
import { Principal } from '@dfinity/principal';

// Mock search results for demo purposes
const MOCK_SEARCH_RESULTS = {
  games: [
    { id: 'game1', name: 'Roulette', path: '/game/roulette', type: 'Featured' },
    { id: 'game2', name: 'Blackjack', path: '/game/blackjack', type: 'Popular' },
    { id: 'game3', name: 'Poker', path: '/game/poker', type: 'New' },
  ],
  tournaments: [
    { id: 'tournament1', name: 'High Roller Tournament', path: '/tournaments/high-roller', prize: '10,000 APTC' },
    { id: 'tournament2', name: 'Weekend Battle', path: '/tournaments/weekend-battle', prize: '5,000 APTC' },
  ],
  pages: [
    { id: 'page1', name: 'Bank', path: '/bank', description: 'Deposit and withdraw funds' },
    { id: 'page2', name: 'Profile', path: '/profile', description: 'Your account details' },
  ]
};

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userAddress, setUserAddress] = useState(null);
  const [isClient, setIsClient] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const searchInputRef = useRef(null);
  const searchPanelRef = useRef(null);
  const notification = useNotification();
  const isDev = process.env.NODE_ENV === 'development';
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showGetTokenModal, setShowGetTokenModal] = useState(false);
  const dispatch = useDispatch();
  const { userBalance, isLoading: isLoadingBalance } = useSelector((state) => state.balance);
  const [walletNetworkName, setWalletNetworkName] = useState("");

  // User balance management
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositAddress, setDepositAddress] = useState("");
  const [isDepositing, setIsDepositing] = useState(false);
  const [aptcTokenAddress, setAptcTokenAddress] = useState("");
  const [isGettingToken, setIsGettingToken] = useState(false);

  // Wallet connection (ICP)
  const [isConnected, setIsConnected] = useState(false);
  const [principalId, setPrincipalId] = useState(null);
  const [walletIdentity, setWalletIdentity] = useState(null);
  const address = principalId;
  const isWalletReady = isConnected && !!address;

  // Mock notifications for UI purposes
  const [notifications, setNotifications] = useState([
    {
      id: '1',
      title: 'Balance Updated',
      message: 'Your APTC balance has been updated',
      isRead: false,
      time: '2 min ago'
    },
    {
      id: '2',
      title: 'New Tournament',
      message: 'High Roller Tournament starts in 1 hour',
      isRead: false,
      time: '1 hour ago'
    }
  ]);

  // Load user balance from local storage only
  const loadUserBalance = async () => {
    if (!address || !walletIdentity) return;
    try {
      dispatch(setLoading(true));
      // Only load from local storage, not from backend
      const saved = loadBalanceFromStorage();
      dispatch(setBalance(saved || '0'));
    } catch (error) {
      console.error('Error loading user balance (local):', error);
      const saved = loadBalanceFromStorage();
      dispatch(setBalance(saved || '0'));
    } finally {
      dispatch(setLoading(false));
    }
  };

  // Load balance when wallet connects (local only, immediate)
  useEffect(() => {
    if (isConnected && address) {
      loadUserBalance();
    }
    const onICPConnected = () => {
      if (isConnected && address) loadUserBalance();
    };
    window.addEventListener('icp-connected', onICPConnected);
    return () => window.removeEventListener('icp-connected', onICPConnected);
  }, [isConnected, address]);

  // ICP wallet integration

  useEffect(() => {
    setIsClient(true);
    setUnreadNotifications(notifications.filter(n => !n.isRead).length);
    
    // Initialize dark mode from local storage if available
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode !== null) {
      setIsDarkMode(savedMode === 'true');
    }
    
    // ICP wallet integration - simplified for testnet only
    // In development mode, use mock data
    if (isDev) {
      setUserAddress('0x1234...dev');
    }
    
    // Handle click outside search panel
    const handleClickOutside = (event) => {
      if (
        searchPanelRef.current && 
        !searchPanelRef.current.contains(event.target) &&
        !searchInputRef.current?.contains(event.target)
      ) {
        setShowSearch(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDev, notifications]);

  // Listen for ICP wallet connection events
  useEffect(() => {
    const handleICPConnection = (event) => {
      // This will be triggered when the ICP wallet connects
      // The actual connection state will be managed by the ICPConnectWalletButton component
      console.log('ICP wallet connection event received');
      // The identity will be set by the ICPConnectWalletButton component
    };

    const handleICPDisconnection = (event) => {
      // Handle disconnection
      setIsConnected(false);
      setPrincipalId(null);
      setWalletIdentity(null);
      console.log('ICP wallet disconnected');
    };

    window.addEventListener('icp-connected', handleICPConnection);
    window.addEventListener('icp-disconnected', handleICPDisconnection);

    return () => {
      window.removeEventListener('icp-connected', handleICPConnection);
      window.removeEventListener('icp-disconnected', handleICPDisconnection);
    };
  }, []);

  // Close balance modal with ESC
  useEffect(() => {
    if (!showBalanceModal) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setShowBalanceModal(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showBalanceModal]);
  
  // Poll for balance changes (local-only placeholder until IC canister wiring)
  const pollForBalance = async (initialBalance, attempts = 10, interval = 2000) => {
    dispatch(setLoading(true));
    for (let i = 0; i < attempts; i++) {
      try {
        const newBalance = loadBalanceFromStorage();
        if (newBalance !== initialBalance) {
          dispatch(setBalance(newBalance));
          notification.success('Balance updated successfully!');
          dispatch(setLoading(false));
          return;
        }
      } catch (error) {
        console.error(`Polling attempt ${i + 1} failed:`, error);
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    notification.error('Balance update timed out. Please refresh manually.');
    dispatch(setLoading(false));
  };

  // Handle withdraw from house account - Simplified without identity check
  const handleWithdraw = async () => {
    try {
      setIsWithdrawing(true);
      
      // Validate withdraw amount
      if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
        notification.error('Please enter a valid withdraw amount');
        return;
      }
      
      // Validate recipient address
      if (!withdrawAddress.trim()) {
        notification.error('Please enter recipient APTC token address');
        return;
      }
      
      try {
        Principal.fromText(withdrawAddress.trim());
      } catch (e) {
        notification.error('Invalid APTC token address format');
        return;
      }

      // Get actor (identity optional)
      const actor = await getCasinoActor();
      
      // Convert amount to octas
      const decimalToOctasNat = (text) => {
        const s = String(text).trim();
        if (!s) return 0n;
        if (isNaN(Number(s))) return 0n;
        const negative = s.startsWith('-');
        const raw = negative ? s.slice(1) : s;
        const parts = raw.split('.');
        const wholePart = parts[0] || '0';
        const fracRaw = parts[1] || '';
        const fracPart = (fracRaw + '00000000').slice(0, 8);
        const OCTAS = 100000000n;
        const whole = BigInt(wholePart);
        const frac = BigInt(fracPart === '' ? '0' : fracPart);
        const val = whole * OCTAS + frac;
        return negative ? 0n : val;
      };

      const requestedOctas = decimalToOctasNat(withdrawAmount);
      const requestedAmount = parseFloat(withdrawAmount);
      
      if (requestedOctas > 0n) {
        // Exact amount withdraw
        await actor.withdraw_to(Principal.fromText(withdrawAddress.trim()), requestedOctas);
        
        // Update balance by subtracting the withdrawn amount
        const currentBalance = parseFloat(userBalance || '0') / 100000000;
        const newBalanceInAPTC = Math.max(0, currentBalance - requestedAmount);
        const newBalanceInOctas = Math.round(newBalanceInAPTC * 100000000);
        dispatch(setBalance(String(newBalanceInOctas)));
        
        notification.success(`Successfully withdrew ${requestedAmount} APTC to ${withdrawAddress}!`);
      } else {
        // Withdraw all
        await actor.withdraw_mint_to(Principal.fromText(withdrawAddress.trim()));
        
        // Set balance to 0 since all was withdrawn
        dispatch(setBalance('0'));
        
        notification.success(`Successfully withdrew all APTC to ${withdrawAddress}!`);
      }
      
      // Clear withdraw form
      setWithdrawAmount("");
      setWithdrawAddress("");
      
      // Close the modal
      setShowBalanceModal(false);
    } catch (error) {
      console.error('Withdraw error:', error);
      
      // Check if it's a timeout or connection error
      if (error.message?.includes('timeout') || 
          error.message?.includes('network') || 
          error.message?.includes('fetch') ||
          error.message?.includes('HTTP')) {
        notification.error('Connection timeout. Please reconnect your Internet Identity and try again.');
      } else {
        notification.error(`Withdrawal failed: ${error.message}`);
      }
    } finally {
      setIsWithdrawing(false);
    }
  };

  // Handle deposit - Simplified without identity check
  const handleDeposit = async () => {
    if (!depositAddress.trim()) {
      notification.error('Please enter your APTC wallet address');
      return;
    }

    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) {
      notification.error('Please enter a valid deposit amount');
      return;
    }

    // Validate APTC wallet address format
    try {
      Principal.fromText(depositAddress.trim());
    } catch (error) {
      notification.error('Invalid APTC wallet address format');
      return;
    }

    setIsDepositing(true);
    try {
      // Get actor (identity optional)
      const actor = await getCasinoActor();
      // Convert decimal text to octas (8 dp) without rounding
      const decimalToOctasNat = (text) => {
        const s = String(text).trim();
        if (!s || isNaN(Number(s))) return 0n;
        const negative = s.startsWith('-');
        const raw = negative ? s.slice(1) : s;
        const parts = raw.split('.');
        const wholePart = parts[0] || '0';
        const fracRaw = parts[1] || '';
        const fracPart = (fracRaw + '00000000').slice(0, 8); // truncate beyond 8dp
        const OCTAS = 100000000n;
        const whole = BigInt(wholePart);
        const frac = BigInt(fracPart === '' ? '0' : fracPart);
        const val = whole * OCTAS + frac;
        return negative ? 0n : val; // disallow negatives
      };
      const amountNat = decimalToOctasNat(depositAmount);
      const octasToDecimalString = (n) => {
        const s = n.toString();
        const len = s.length;
        if (len <= 8) {
          const frac = '0'.repeat(8 - len) + s;
          return `0.${frac}`;
        }
        const whole = s.slice(0, len - 8);
        const frac = s.slice(len - 8);
        // keep all 8 decimals to avoid rounding on consumer side
        return `${whole}.${frac}`;
      };
      
      // Request deposit nonce and casino principal from backend
      const [nonce, casinoPrincipalText] = await actor.request_deposit(amountNat);
      
      // Store nonce for later verification
      localStorage.setItem('pendingDepositNonce', nonce.toString());
      localStorage.setItem('pendingDepositAmount', amountNat.toString());
      localStorage.setItem('pendingDepositCasinoPrincipal', casinoPrincipalText);
      
      // Create NNS transfer URL with pre-filled details
      const nnsAmount = octasToDecimalString(amountNat);
      const nnsUrl = `https://nns.ic0.app/wallet/?u=f2kju-siaaa-aaaan-qz5zq-cai&to=${casinoPrincipalText}&amount=${nnsAmount}&memo=${nonce}`;
      
      // Open NNS in new tab
      window.open(nnsUrl, '_blank');
      
      // Show success message with clear instructions
      notification.success(`Deposit request created! Nonce: ${nonce}\n\nNNS transfer page opened. Please:\n1. Complete the transfer to ${casinoPrincipalText}\n2. Use memo: ${nonce}\n3. Return here and click "Check Completion"`);
      
      // Clear form
      setDepositAmount("");
      setDepositAddress("");
      
    } catch (error) {
      console.error('Deposit request error:', error);
      
      // Check if it's a timeout or connection error
      if (error.message?.includes('timeout') || 
          error.message?.includes('network') || 
          error.message?.includes('fetch') ||
          error.message?.includes('HTTP')) {
        notification.error('Connection timeout. Please reconnect your Internet Identity and try again.');
      } else {
        const msg = (error && (error.message || (typeof error === 'string' ? error : 'Unknown error'))) || 'Unknown error';
        notification.error(`Deposit request failed: ${msg}`);
      }
    } finally {
      setIsDepositing(false);
    }
  };

  // Handle deposit completion check - Simplified without identity check
  const handleCheckDepositCompletion = async () => {
    const nonce = localStorage.getItem('pendingDepositNonce');
    if (!nonce) {
      notification.error('No pending deposit found');
      return;
    }

    try {
      // Get actor (identity optional)
      const actor = await getCasinoActor();
      const [success, newBalance] = await actor.check_deposit_completion(BigInt(nonce));
      
      if (success) {
        // Get the pending deposit amount from localStorage
        const pendingAmount = localStorage.getItem('pendingDepositAmount');
        if (pendingAmount) {
          const depositAmountInAPTC = Number(pendingAmount) / 100000000;
          const currentBalanceInOctas = parseFloat(userBalance || '0');
          const currentBalanceInAPTC = currentBalanceInOctas / 100000000;
          const newTotalBalanceInAPTC = currentBalanceInAPTC + depositAmountInAPTC;
          const newTotalBalanceInOctas = Math.round(newTotalBalanceInAPTC * 100000000);
          
          // Update local balance (in octas format)
          dispatch(setBalance(String(newTotalBalanceInOctas)));
          
          // Clear pending deposit data
          localStorage.removeItem('pendingDepositNonce');
          localStorage.removeItem('pendingDepositAmount');
          
          notification.success(`Deposit completed successfully! New balance: ${newTotalBalanceInAPTC.toFixed(8)} APTC`);
        } else {
          notification.error('Deposit completed but pending amount not found');
        }
      } else {
        notification.error('Deposit not yet completed. Please wait for the NNS transfer to be processed.');
      }
      
    } catch (error) {
      console.error('Deposit completion check error:', error);
      
      // Check if it's a timeout or connection error
      if (error.message?.includes('timeout') || 
          error.message?.includes('network') || 
          error.message?.includes('fetch') ||
          error.message?.includes('HTTP')) {
        notification.error('Connection timeout. Please reconnect your Internet Identity and try again.');
      } else {
        const msg = (error && (error.message || (typeof error === 'string' ? error : 'Unknown error'))) || 'Unknown error';
        notification.error(`Deposit completion check failed: ${msg}`);
      }
    }
  };

  // Handle APTC token sending - Simplified without identity check
  const handleGetAPTC = async () => {
    if (!aptcTokenAddress.trim()) {
      notification.error('Please enter your APTC token address');
      return;
    }

    // Validate APTC token address format (should be a valid principal)
    try {
      Principal.fromText(aptcTokenAddress.trim());
    } catch (error) {
      notification.error('Invalid APTC token address format');
      return;
    }

    setIsGettingToken(true);
    try {
      // Get actor (identity optional)
      const actor = await getCasinoActor();

      // Mint 500 APTC directly to the provided principal (backend is token minter)
      const amountNat = BigInt(500 * 100000000); // 500 APTC in 8dp
      await actor.mint_aptc_to(Principal.fromText(aptcTokenAddress.trim()), amountNat);

      notification.success('Successfully minted and sent 500 APTC to your token address!');
      setAptcTokenAddress("");
      setShowGetTokenModal(false);

    } catch (error) {
      console.error('APTC sending error:', error);
      
      // Check if it's a timeout or connection error
      if (error.message?.includes('timeout') || 
          error.message?.includes('network') || 
          error.message?.includes('fetch') ||
          error.message?.includes('HTTP')) {
        notification.error('Connection timeout. Please reconnect your Internet Identity and try again.');
      } else {
        const msg = (error && (error.message || (typeof error === 'string' ? error : 'Unknown error'))) || 'Unknown error';
        notification.error(`Failed to send APTC: ${msg}`);
      }
    } finally {
      setIsGettingToken(false);
    }
  };

  // Handle search input
  useEffect(() => {
    if (searchQuery.length > 1) {
      // In a real app, you would call an API here
      // For demo, we'll filter the mock data
      const query = searchQuery.toLowerCase();
      const games = MOCK_SEARCH_RESULTS.games.filter(
        game => game.name.toLowerCase().includes(query)
      );
      const tournaments = MOCK_SEARCH_RESULTS.tournaments.filter(
        tournament => tournament.name.toLowerCase().includes(query)
      );
      const pages = MOCK_SEARCH_RESULTS.pages.filter(
        page => page.name.toLowerCase().includes(query) || 
               (page.description && page.description.toLowerCase().includes(query))
      );
      
      setSearchResults({ games, tournaments, pages });
    } else {
      setSearchResults(null);
    }
  }, [searchQuery]);

  const navLinks = [
    {
      name: "Home",
      path: "/",
      classes: "text-hover-gradient-home",
    },
    {
      name: "Game",
      path: "/game",
      classes: "text-hover-gradient-game",
    },
    {
      name: "Bank",
      path: "/bank",
      classes: "text-hover-gradient-bank",
    },
  ];

  const handleProfileClick = () => {
    router.push("/profile");
  };
  
  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('darkMode', newMode.toString());
    // Here you would also apply the theme change to your app
  };
  
  const markNotificationAsRead = (id) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? {...n, isRead: true} : n)
    );
    setUnreadNotifications(prev => Math.max(0, prev - 1));
  };
  
  const clearAllNotifications = () => {
    setNotifications(prev => prev.map(n => ({...n, isRead: true})));
    setUnreadNotifications(0);
    setShowNotificationsPanel(false);
    notification.success("All notifications marked as read");
  };
  
  const handleSearchIconClick = () => {
    setShowSearch(prev => !prev);
    if (!showSearch) {
      // Focus the search input when opening
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  };
  
  const handleSearchItemClick = (path) => {
    router.push(path);
    setShowSearch(false);
    setSearchQuery('');
  };

  // Network detection not applicable for Plug (IC)

  const switchToTestnet = async () => {};

  return (
    <nav className="backdrop-blur-md bg-[#070005]/90 fixed w-full z-20 transition-all duration-300 shadow-lg">
      <div className="flex w-full items-center justify-between py-6 px-4 sm:px-10 md:px-20 lg:px-36">
        <div className="flex items-center">
          <a href="/" className="logo mr-6">
          <Image
            src="/PowerPlay.png"
            alt="powerplay image"
            width={172}
            height={15}
            />
          </a>
          
          {/* Mobile menu button */}
          <button 
            className="md:hidden text-white p-1 rounded-lg hover:bg-purple-500/20 transition-colors"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            aria-label="Toggle mobile menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {showMobileMenu ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </>
              ) : (
                <>
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </>
              )}
            </svg>
          </button>
        </div>
        
        {/* Desktop Navigation Links */}
        <div className="hidden md:flex font-display gap-8 lg:gap-12 items-center">
          {navLinks.map(({ name, path, classes }, index) => (
            <div key={index} className="relative group">
            <Link
                className={`${path === pathname ? "text-transparent bg-clip-text bg-gradient-to-r from-red-magic to-blue-magic font-semibold" : classes} flex items-center gap-1 text-lg font-medium transition-all duration-200 hover:scale-105`}
              href={path}
            >
              {name}
            </Link>
            </div>
          ))}
        </div>
        
        <div className="flex items-center gap-2 md:gap-3">
          {/* Search Icon */}
          <div className="relative">
            <button 
              className="p-2 text-white/70 hover:text-white transition-colors rounded-full hover:bg-purple-500/20"
              onClick={handleSearchIconClick}
              aria-label="Search"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </button>
            
            {/* Search Panel */}
            {showSearch && (
              <div 
                className="absolute right-0 mt-2 w-80 md:w-96 bg-[#1A0015]/95 backdrop-blur-md border border-purple-500/30 rounded-lg shadow-xl z-40 animate-fadeIn"
                ref={searchPanelRef}
              >
                <div className="p-3">
                  <div className="relative">
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search games, tournaments..."
                      className="w-full py-2 px-3 pr-10 bg-[#250020] border border-purple-500/20 rounded-md text-white focus:outline-none focus:border-purple-500"
                    />
                    <svg 
                      className="absolute right-3 top-2.5 text-white/50" 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="16" 
                      height="16" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2"
                    >
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                  </div>
                </div>
                
                {searchQuery.length > 1 && (
                  <div className="max-h-96 overflow-y-auto">
                    {(!searchResults || 
                      (searchResults.games.length === 0 && 
                       searchResults.tournaments.length === 0 && 
                       searchResults.pages.length === 0)) ? (
                      <div className="p-4 text-center text-white/50">
                        No results found
                      </div>
                    ) : (
                      <>
                        {/* Games */}
                        {searchResults.games.length > 0 && (
                          <div className="p-2">
                            <h3 className="text-xs font-medium text-white/50 uppercase px-3 mb-1">Games</h3>
                            {searchResults.games.map(game => (
                              <div 
                                key={game.id}
                                className="p-2 hover:bg-purple-500/10 rounded-md cursor-pointer mx-1"
                                onClick={() => handleSearchItemClick(game.path)}
                              >
                                <div className="flex items-center">
                                  <div className="w-8 h-8 rounded-md bg-purple-800/30 flex items-center justify-center mr-3">
                                    <span className="text-sm">{game.name.charAt(0)}</span>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-white">{game.name}</p>
                                    <span className="text-xs text-white/50">{game.type}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Tournaments */}
                        {searchResults.tournaments.length > 0 && (
                          <div className="p-2">
                            <h3 className="text-xs font-medium text-white/50 uppercase px-3 mb-1">Tournaments</h3>
                            {searchResults.tournaments.map(tournament => (
                              <div 
                                key={tournament.id}
                                className="p-2 hover:bg-purple-500/10 rounded-md cursor-pointer mx-1"
                                onClick={() => handleSearchItemClick(tournament.path)}
                              >
                                <div className="flex items-center">
                                  <div className="w-8 h-8 rounded-md bg-red-800/30 flex items-center justify-center mr-3">
                                    <span className="text-sm">🏆</span>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-white">{tournament.name}</p>
                                    <span className="text-xs text-white/50">Prize: {tournament.prize}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Pages */}
                        {searchResults.pages.length > 0 && (
                          <div className="p-2">
                            <h3 className="text-xs font-medium text-white/50 uppercase px-3 mb-1">Pages</h3>
                            {searchResults.pages.map(page => (
                              <div 
                                key={page.id}
                                className="p-2 hover:bg-purple-500/10 rounded-md cursor-pointer mx-1"
                                onClick={() => handleSearchItemClick(page.path)}
                              >
                                <div className="flex items-center">
                                  <div className="w-8 h-8 rounded-md bg-blue-800/30 flex items-center justify-center mr-3">
                                    <span className="text-sm">{page.name.charAt(0)}</span>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-white">{page.name}</p>
                                    {page.description && (
                                      <span className="text-xs text-white/50">{page.description}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
                
                {searchQuery.length > 0 && (
                  <div className="p-2 border-t border-purple-500/20 text-center">
                    <span className="text-xs text-white/50">
                      Press Enter to search for "{searchQuery}"
                </span>
                  </div>
                )}
              </div>
            )}
          </div>
        
          {/* Theme Toggle */}
          <button 
            onClick={toggleDarkMode}
            className="p-2 text-white/70 hover:text-white transition-colors hidden md:block rounded-full hover:bg-purple-500/20"
            aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDarkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="4"></circle>
                <path d="M12 2v2"></path>
                <path d="M12 20v2"></path>
                <path d="M5 5l1.5 1.5"></path>
                <path d="M17.5 17.5l1.5 1.5"></path>
                <path d="M2 12h2"></path>
                <path d="M20 12h2"></path>
                <path d="M5 19l1.5-1.5"></path>
                <path d="M17.5 6.5l1.5-1.5"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            )}
          </button>
          
          {/* Notifications */}
          <div className="relative hidden md:block">
            <button 
              onClick={() => setShowNotificationsPanel(!showNotificationsPanel)}
              className="p-2 text-white/70 hover:text-white transition-colors relative rounded-full hover:bg-purple-500/20"
              aria-label="Notifications"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              {unreadNotifications > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center font-bold">
                  {unreadNotifications}
                </span>
              )}
            </button>
            
            {/* Notifications Panel */}
            {showNotificationsPanel && (
              <div className="absolute right-0 mt-2 w-80 bg-[#1A0015]/95 backdrop-blur-md border border-purple-500/30 rounded-lg shadow-xl z-30 animate-fadeIn">
                <div className="p-3 border-b border-purple-500/20 flex justify-between items-center">
                  <h3 className="font-medium text-white">Notifications</h3>
                  <button 
                    onClick={clearAllNotifications}
                    className="text-xs text-white/50 hover:text-white"
                  >
                    Mark all as read
                  </button>
                </div>
                
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-white/50">
                      No notifications
                    </div>
                  ) : (
                    notifications.map(notification => (
                      <div 
                        key={notification.id}
                        className={`p-3 border-b border-purple-500/10 hover:bg-purple-500/5 cursor-pointer ${!notification.isRead ? 'bg-purple-900/10' : ''}`}
                        onClick={() => markNotificationAsRead(notification.id)}
                      >
                        <div className="flex justify-between">
                          <h4 className="font-medium text-white text-sm">{notification.title}</h4>
                          <span className="text-xs text-white/40">{notification.time}</span>
                        </div>
                        <p className="text-xs text-white/70 mt-1">{notification.message}</p>
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-red-500 rounded-full absolute top-3 right-3"></div>
                        )}
                      </div>
                    ))
                  )}
                </div>
                
                <div className="p-2 border-t border-purple-500/20 text-center">
                  <a href="/notifications" className="text-xs text-white/70 hover:text-white">
                    View all notifications
                  </a>
                </div>
              </div>
            )}
          </div>
          

          
          {/* User Balance Display */}
          {isConnected && (
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-green-900/20 to-green-800/10 rounded-lg border border-green-800/30 px-3 py-2">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-300">Balance:</span>
                  <span className="text-sm text-green-300 font-medium">
                    {isLoadingBalance ? 'Loading...' : `${(parseFloat(userBalance || '0') / 100000000).toFixed(3)} APTC`}
                  </span>
                  <button
                    onClick={() => {
                  setShowBalanceModal(true);
                  setWithdrawAmount("");
                  setWithdrawAddress("");
                }}
                    className="ml-2 text-xs bg-green-600/30 hover:bg-green-500/30 text-green-300 px-2 py-1 rounded transition-colors"
                  >
                    Manage
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* ICP Wallet Button */}
          <ICPConnectWalletButton 
            whitelist={[process.env.NEXT_PUBLIC_CASINO_CANISTER_ID || 'd7bsl-tiaaa-aaaan-qz5pq-cai']}
            onConnectionChange={({ connected, principalId, identity }) => {
              setIsConnected(connected);
              setPrincipalId(principalId);
              setWalletIdentity(identity);
            }}
          />

          {/* Get 500 APTC Token Button */}
          {isConnected && (
            <button
              onClick={() => setShowGetTokenModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-yellow-600 to-orange-600 text-white font-medium rounded-lg hover:from-yellow-700 hover:to-orange-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Get 500 APTC Token
            </button>
          )}
  
        </div>
      </div>
      
      {/* Mobile Navigation Menu */}
      {showMobileMenu && (
        <div className="md:hidden bg-[#0A0008]/95 backdrop-blur-md p-4 border-t border-purple-500/20 animate-slideDown">
          <div className="flex flex-col space-y-3">
            {navLinks.map(({ name, path, classes }, index) => (
              <div key={index}>
                <Link
                  className={`${path === pathname ? 'text-white font-semibold' : 'text-white/80'} py-2 px-3 rounded-md hover:bg-purple-500/10 flex items-center w-full text-lg`}
                  href={path}
                  onClick={() => setShowMobileMenu(false)}
                >
                  {name}
                </Link>
              </div>
            ))}
            {/* Mobile-only: switch to testnet if wallet is on mainnet */}
            {walletNetworkName === 'mainnet' && (
              <button
                onClick={switchToTestnet}
                className="mt-2 py-2 px-3 rounded-md bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium"
              >
                Switch to Testnet
              </button>
            )}
            <div className="flex justify-between items-center py-2 px-3">
              <span className="text-white/70">Dark Mode</span>
              <button 
                onClick={toggleDarkMode}
                className="p-2 text-white/70 hover:text-white bg-purple-500/10 rounded-full flex items-center justify-center h-8 w-8"
              >
                {isDarkMode ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="4"></circle>
                    <path d="M12 2v2"></path>
                    <path d="M12 20v2"></path>
                    <path d="M5 5l1.5 1.5"></path>
                    <path d="M17.5 17.5l1.5 1.5"></path>
                    <path d="M2 12h2"></path>
                    <path d="M20 12h2"></path>
                    <path d="M5 19l1.5-1.5"></path>
                    <path d="M17.5 6.5l1.5-1.5"></path>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                  </svg>
                )}
              </button>
            </div>
            
            {/* User Balance in Mobile Menu */}
            {isWalletReady && (
              <div className="pt-2 mt-2 border-t border-purple-500/10">
                <div className="p-3 bg-gradient-to-r from-green-900/20 to-green-800/10 rounded-lg border border-green-800/30">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-300">House Balance:</span>
                    <span className="text-sm text-green-300 font-medium">
                      {isLoadingBalance ? 'Loading...' : `${(parseFloat(userBalance) / 100000000).toFixed(3)} APTC`}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setShowBalanceModal(true);
                      setShowMobileMenu(false);
                      setWithdrawAmount("");
                      setWithdrawAddress("");
                    }}
                    className="w-full text-xs bg-green-600/30 hover:bg-green-500/30 text-green-300 px-3 py-2 rounded transition-colors"
                  >
                    Manage Balance
                  </button>
                </div>
              </div>
            )}
            
            <div className="pt-2 mt-2 border-t border-purple-500/10">
              <a 
                href="#support" 
                className="block py-2 px-3 text-white/80 hover:text-white hover:bg-purple-500/10 rounded-md"
                onClick={() => setShowMobileMenu(false)}
              >
                Support
              </a>
            </div>
          </div>
        </div>
      )}
      
      {/* Balance Management Modal (portal) */}
      {isClient && showBalanceModal && createPortal(
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowBalanceModal(false)}
        >
          <div
            className="bg-[#0A0008] border border-purple-500/20 rounded-lg p-6 w-full max-w-md mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">House Balance</h3>
              <button
                onClick={() => setShowBalanceModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Current Balance */}
            <div className="mb-4 p-3 bg-gradient-to-r from-green-900/20 to-green-800/10 rounded-lg border border-green-800/30">
              <span className="text-sm text-gray-300">Current Balance:</span>
              <div className="text-lg text-green-300 font-bold">
                {isLoadingBalance ? 'Loading...' : `${(parseFloat(userBalance || '0') / 100000000).toFixed(3)} APTC`}
              </div>
            </div>
            
            {/* Deposit Section */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-white mb-2">Deposit APTC</h4>
              <div className="mb-2 text-[11px] text-gray-400">
                <div className="flex items-center gap-2">
                  <span>Casino canister address:</span>
                  <code className="px-2 py-0.5 rounded bg-gray-800/60 text-gray-200">
                    {process.env.NEXT_PUBLIC_CASINO_CANISTER_ID || 'd7bsl-tiaaa-aaaan-qz5pq-cai'}
                  </code>
                  <button
                    onClick={() => {
                      const val = process.env.NEXT_PUBLIC_CASINO_CANISTER_ID || 'd7bsl-tiaaa-aaaan-qz5pq-cai';
                      if (typeof navigator !== 'undefined' && navigator.clipboard) {
                        navigator.clipboard.writeText(val);
                        notification.success('Casino canister ID copied');
                      }
                    }}
                    className="text-[10px] px-2 py-1 bg-gray-700/60 hover:bg-gray-600/60 rounded text-gray-100"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <div className="mb-3">
                <input
                  type="text"
                  value={depositAddress}
                  onChange={(e) => setDepositAddress(e.target.value)}
                  placeholder="Your APTC wallet address (principal)"
                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600/50 rounded text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/25"
                  disabled={isDepositing}
                />
                <p className="text-xs text-gray-400 mt-1">Enter your APTC wallet address to receive deposit instructions</p>
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="Enter APTC amount"
                  className="flex-1 px-3 py-2 bg-gray-800/50 border border-gray-600/50 rounded text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/25"
                  min="0"
                  step="0.00000001"
                  disabled={isDepositing}
                />
                <button
                  onClick={handleDeposit}
                  disabled={!depositAmount || !depositAddress.trim() || parseFloat(depositAmount) <= 0 || isDepositing}
                  className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded font-medium transition-colors flex items-center gap-2"
                >
                  {isDepositing ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white/20 border-t-white rounded-full"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      Deposit
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8l-8-8-8 8" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Click Deposit to open NNS transfer page with pre-filled details
              </p>
              {typeof window !== 'undefined' && localStorage.getItem('pendingDepositNonce') && (
                <div className="mt-3 p-3 bg-gray-900/30 rounded-lg border border-gray-700/30 text-xs text-gray-300 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-gray-400">Send APTC to</span>
                    <div className="flex items-center gap-2">
                      <code className="px-2 py-1 rounded bg-gray-800/60 text-gray-200 break-all">
                        {localStorage.getItem('pendingDepositCasinoPrincipal') || process.env.NEXT_PUBLIC_CASINO_CANISTER_ID || 'd7bsl-tiaaa-aaaan-qz5pq-cai'}
                      </code>
                      <button
                        onClick={() => {
                          const val = (typeof window !== 'undefined' && localStorage.getItem('pendingDepositCasinoPrincipal')) || process.env.NEXT_PUBLIC_CASINO_CANISTER_ID || 'd7bsl-tiaaa-aaaan-qz5pq-cai';
                          if (typeof navigator !== 'undefined' && navigator.clipboard) {
                            navigator.clipboard.writeText(val);
                            notification.success('Casino canister ID copied');
                          }
                        }}
                        className="text-[10px] px-2 py-1 bg-gray-700/60 hover:bg-gray-600/60 rounded text-gray-100"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-gray-400">Memo</span>
                    <code className="px-2 py-1 rounded bg-gray-800/60 text-gray-200">
                      {localStorage.getItem('pendingDepositNonce')}
                    </code>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-gray-400">Amount</span>
                    <code className="px-2 py-1 rounded bg-gray-800/60 text-gray-200">
                      {(() => {
                        const amt = localStorage.getItem('pendingDepositAmount');
                        const n = amt ? Number(amt) : 0;
                        return (n / 100000000).toFixed(8);
                      })()} APTC
                    </code>
                  </div>
                  <a
                    href={`https://nns.ic0.app/wallet/?u=f2kju-siaaa-aaaan-qz5zq-cai&to=${encodeURIComponent(localStorage.getItem('pendingDepositCasinoPrincipal') || process.env.NEXT_PUBLIC_CASINO_CANISTER_ID || 'd7bsl-tiaaa-aaaan-qz5pq-cai')}&amount=${(() => { const amt = localStorage.getItem('pendingDepositAmount'); const n = amt ? Number(amt) : 0; return (n / 100000000).toString(); })()}&memo=${localStorage.getItem('pendingDepositNonce')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-300 hover:text-blue-200 underline"
                  >
                    Open NNS to complete transfer
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              )}
              {/* Quick Deposit Buttons */}
              <div className="flex gap-1 mt-2">
                {[100, 250, 500, 1000].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setDepositAmount(amount.toString())}
                    className="flex-1 px-2 py-1 text-xs bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 rounded transition-colors"
                    disabled={isDepositing}
                  >
                    {amount} APTC
                  </button>
                ))}
              </div>
              
              {/* Check Completion Button */}
              <div className="mt-4">
                <button
                  onClick={handleCheckDepositCompletion}
                  disabled={!localStorage.getItem('pendingDepositNonce')}
                  className="w-full px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded font-medium transition-colors flex items-center justify-center gap-2"
                >
                  Check Deposit Completion
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                <p className="text-xs text-gray-400 mt-1 text-center">
                  Click after completing the NNS transfer to verify and update your balance
                </p>
              </div>
            </div>

            {/* Withdraw Section */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-white mb-2">Withdraw APTC</h4>
              <div className="mb-2">
                <input
                  type="text"
                  value={withdrawAddress}
                  onChange={(e) => setWithdrawAddress(e.target.value)}
                  placeholder="Recipient APTC token address (principal)"
                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600/50 rounded text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/25"
                  disabled={isWithdrawing}
                />
                <p className="text-[11px] text-gray-400 mt-1">Funds will be sent from casino treasury to this address.</p>
              </div>
              
              {/* Withdraw Amount Input */}
              <div className="mb-2">
                <label className="block text-gray-300 mb-2">Withdraw Amount (APTC)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => {
                      const value = e.target.value;
                      const maxAmount = parseFloat(userBalance || '0') / 100000000;
                      if (parseFloat(value) > maxAmount) {
                        setWithdrawAmount(maxAmount.toString());
                        notification.info(`Amount capped at maximum available balance: ${maxAmount.toFixed(8)} APTC`);
                      } else {
                        setWithdrawAmount(value);
                      }
                    }}
                    placeholder="0.00"
                    min="0"
                    max={(parseFloat(userBalance || '0') / 100000000)}
                    step="0.00000001"
                    className="flex-1 px-3 py-2 bg-gray-800/50 border border-gray-600/50 rounded text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/25"
                    disabled={isWithdrawing}
                  />
                  <button
                    onClick={() => setWithdrawAmount((parseFloat(userBalance || '0') / 100000000).toString())}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
                    disabled={isWithdrawing}
                  >
                    Max
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  Available: {(parseFloat(userBalance || '0') / 100000000).toFixed(8)} APTC
                </p>
              </div>
              
              <button
                onClick={handleWithdraw}
                disabled={parseFloat(userBalance || '0') <= 0 || isWithdrawing || !withdrawAddress.trim() || !withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > (parseFloat(userBalance || '0') / 100000000)}
                className="w-full px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded font-medium transition-colors flex items-center justify-center gap-2"
              >
                {isWithdrawing ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white/20 border-t-white rounded-full"></div>
                    Processing...
                  </>
                ) : isConnected ? (
                  parseFloat(userBalance || '0') > 0 ? 'Withdraw APTC' : 'No Balance'
                ) : 'Connect Wallet'}
                {isConnected && parseFloat(userBalance || '0') > 0 && !isWithdrawing && (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoinround="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
              
              {isConnected && parseFloat(userBalance || '0') > 0 && withdrawAmount && parseFloat(withdrawAmount) > 0 && (
                <p className="text-xs text-gray-400 mt-1 text-center">
                  Withdraw {parseFloat(withdrawAmount)} APTC to the entered token address
                </p>
              )}
            </div>
            
            {/* Refresh Balance */}
            <div className="mt-6">
              <button
                onClick={() => {
                  // Only refresh from localStorage, don't try blockchain
                  const savedBalance = loadBalanceFromStorage();
                  if (savedBalance && savedBalance !== "0") {
                    console.log('Refreshing balance from localStorage:', savedBalance);
                    dispatch(setBalance(savedBalance));
                  } else {
                    console.log('No saved balance in localStorage');
                  }
                }}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium transition-colors"
              >
                Refresh Balance
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Get APTC Token Modal (portal) */}
      {isClient && showGetTokenModal && createPortal(
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowGetTokenModal(false)}
        >
          <div
            className="bg-[#0A0008] border border-purple-500/20 rounded-lg p-6 w-full max-w-md mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Get 500 APTC Token</h3>
              <button
                onClick={() => setShowGetTokenModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* NNS Token Import Info */}
            <div className="mb-4 p-3 bg-gradient-to-r from-blue-900/20 to-blue-800/10 rounded-lg border border-blue-800/30">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-blue-300">APTC Token Information</span>
              </div>
              <p className="text-xs text-blue-200 mb-2">
                Token Address: <code className="bg-blue-900/50 px-2 py-1 rounded text-blue-100">f2kju-siaaa-aaaan-qz5zq-cai</code>
              </p>
              <a
                href="https://nns.ic0.app/tokens/?import-ledger-id=f2kju-siaaa-aaaan-qz5zq-cai"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs text-blue-300 hover:text-blue-200 underline"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Add APTC Token to NNS
              </a>
            </div>
            
                              {/* APTC Token Address Input */}
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-white mb-2">Your APTC Token Address</h4>
                    <input
                      type="text"
                      value={aptcTokenAddress}
                      onChange={(e) => setAptcTokenAddress(e.target.value)}
                      placeholder="Enter your APTC token address (e.g., gudif-djfon-cwqgb-csjoe-fmkc2-kqfgp-usywp-beq4d-e3a6c-vpum7-zae)"
                      className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600/50 rounded text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/25"
                      disabled={isGettingToken}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Enter the APTC token address where you want to receive 500 APTC tokens
                    </p>
                  </div>

            {/* Get APTC Button */}
            <div className="mb-4">
              <button
                onClick={handleGetAPTC}
                disabled={!aptcTokenAddress.trim() || isGettingToken}
                className="w-full px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded font-medium transition-colors flex items-center justify-center gap-2"
              >
                {isGettingToken ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white/20 border-t-white rounded-full"></div>
                    Sending APTC...
                  </>
                ) : (
                  <>
                    Get 500 APTC Tokens
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </>
                )}
              </button>
            </div>

            {/* Instructions */}
            <div className="text-xs text-gray-400 space-y-1">
              <p>1. First add APTC token to your NNS wallet using the link above (opens NNS with ledger ID set to <code>f2kju-siaaa-aaaan-qz5zq-cai</code>).</p>
              <p>2. Enter your APTC token address in the input field</p>
              <p>3. Click "Get 500 APTC Tokens" to receive tokens from the casino</p>
            </div>
          </div>
        </div>,
        document.body
      )}
      
      <div className="w-full h-[2px] magic-gradient overflow-hidden"></div>
    </nav>
  );
}