// Backend Connection Test Component for Mines Game
import React, { useState, useEffect } from "react";
import { useNFID } from "../../providers/NFIDProvider";
import {
  createMinesActor,
  createAPTCTokenActor,
  CANISTER_IDS,
} from "../../config/aptc-config";
import { Principal } from "@dfinity/principal";

const MinesBackendTest = () => {
  const { isConnected, principal, identity } = useNFID();
  const [testResults, setTestResults] = useState({
    minesActor: null,
    tokenActor: null,
    canisterIds: null,
    userBalance: null,
    gameStatus: null,
    errors: [],
  });
  const [testing, setTesting] = useState(false);

  const runTests = async () => {
    setTesting(true);
    const results = {
      minesActor: null,
      tokenActor: null,
      canisterIds: CANISTER_IDS,
      userBalance: null,
      gameStatus: null,
      errors: [],
    };

    try {
      console.log("🧪 Testing backend connections...");

      // Test 1: Create Mines Actor
      try {
        console.log("📡 Creating Mines actor...");
        const minesActor = await createMinesActor(identity);
        results.minesActor = "✅ Connected";
        console.log("✅ Mines actor created successfully");

        // Test game methods
        try {
          const gameStats = await minesActor.getGameStats();
          results.gameStatus = `✅ Game active - ${gameStats.totalGames} total games`;
        } catch (err) {
          results.gameStatus = `⚠️ Game stats error: ${err.message}`;
          results.errors.push(`Game stats: ${err.message}`);
        }
      } catch (err) {
        results.minesActor = `❌ Failed: ${err.message}`;
        results.errors.push(`Mines actor: ${err.message}`);
      }

      // Test 2: Create Token Actor
      try {
        console.log("🪙 Creating Token actor...");
        const tokenActor = await createAPTCTokenActor(identity);
        results.tokenActor = "✅ Connected";
        console.log("✅ Token actor created successfully");

        // Test balance if we have a principal
        if (principal) {
          try {
            const balance = await tokenActor.icrc1_balance_of({
              owner: Principal.fromText(principal),
              subaccount: [],
            });
            const balanceFormatted = (Number(balance) / 100000000).toFixed(2);
            results.userBalance = `✅ ${balanceFormatted} APTC`;
          } catch (err) {
            results.userBalance = `⚠️ Balance error: ${err.message}`;
            results.errors.push(`Token balance: ${err.message}`);
          }
        } else {
          results.userBalance = "⚠️ No principal available";
        }
      } catch (err) {
        results.tokenActor = `❌ Failed: ${err.message}`;
        results.errors.push(`Token actor: ${err.message}`);
      }
    } catch (err) {
      results.errors.push(`General error: ${err.message}`);
    }

    setTestResults(results);
    setTesting(false);
  };

  useEffect(() => {
    if (isConnected && identity && principal) {
      runTests();
    }
  }, [isConnected, identity, principal]);

  if (!isConnected) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center">
        <h3 className="text-white text-xl font-bold mb-4">
          Backend Connection Test
        </h3>
        <p className="text-white/70">
          Please connect your wallet to test backend connections
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white text-xl font-bold">
          Backend Connection Test
        </h3>
        <button
          onClick={runTests}
          disabled={testing}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {testing ? "Testing..." : "Retest"}
        </button>
      </div>

      <div className="space-y-4">
        {/* Connection Status */}
        <div className="bg-gray-700 rounded p-4">
          <h4 className="text-white font-semibold mb-2">Connection Status</h4>
          <div className="space-y-1 text-sm">
            <p className="text-white/80">
              Wallet Connected: {isConnected ? "✅ Yes" : "❌ No"}
            </p>
            <p className="text-white/80">
              Principal:{" "}
              {principal
                ? `✅ ${principal.slice(0, 20)}...`
                : "❌ Not available"}
            </p>
            <p className="text-white/80">
              Identity: {identity ? "✅ Available" : "❌ Not available"}
            </p>
          </div>
        </div>

        {/* Canister IDs */}
        <div className="bg-gray-700 rounded p-4">
          <h4 className="text-white font-semibold mb-2">Canister IDs</h4>
          <div className="space-y-1 text-sm">
            <p className="text-white/80">
              Mines:{" "}
              <code className="bg-gray-600 px-1 rounded">
                {testResults.canisterIds?.mines || "Not loaded"}
              </code>
            </p>
            <p className="text-white/80">
              Token:{" "}
              <code className="bg-gray-600 px-1 rounded">
                {testResults.canisterIds?.aptc_token || "Not loaded"}
              </code>
            </p>
          </div>
        </div>

        {/* Actor Status */}
        <div className="bg-gray-700 rounded p-4">
          <h4 className="text-white font-semibold mb-2">Actor Status</h4>
          <div className="space-y-1 text-sm">
            <p className="text-white/80">
              Mines Actor: {testResults.minesActor || "⏳ Testing..."}
            </p>
            <p className="text-white/80">
              Token Actor: {testResults.tokenActor || "⏳ Testing..."}
            </p>
            <p className="text-white/80">
              User Balance: {testResults.userBalance || "⏳ Testing..."}
            </p>
            <p className="text-white/80">
              Game Status: {testResults.gameStatus || "⏳ Testing..."}
            </p>
          </div>
        </div>

        {/* Errors */}
        {testResults.errors.length > 0 && (
          <div className="bg-red-900/30 border border-red-700 rounded p-4">
            <h4 className="text-red-400 font-semibold mb-2">Errors</h4>
            <div className="space-y-1 text-sm">
              {testResults.errors.map((error, index) => (
                <p key={index} className="text-red-300">
                  ❌ {error}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Success Summary */}
        {testResults.errors.length === 0 &&
          testResults.minesActor &&
          testResults.tokenActor && (
            <div className="bg-green-900/30 border border-green-700 rounded p-4">
              <h4 className="text-green-400 font-semibold mb-2">
                All Tests Passed!
              </h4>
              <p className="text-green-300 text-sm">
                ✅ Backend integration is working correctly
              </p>
            </div>
          )}
      </div>
    </div>
  );
};

export default MinesBackendTest;
