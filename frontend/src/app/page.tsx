'use client';

// Add this declaration at the top of your file
declare global {
  interface Window {
    ethereum?: any;
  }
}

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ethers } from "ethers";
import Link from 'next/link';

export default function Home() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [showMetaMaskPrompt, setShowMetaMaskPrompt] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Apply dark mode class to body
    document.body.classList.add('dark');
  }, []);

  const connectWallet = async () => {
    setIsConnecting(true);
    try {
      if (typeof window.ethereum !== 'undefined') {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.BrowserProvider(window.ethereum);
        // You can add more logic here if needed
        router.push('/chat');
      } else {
        setShowMetaMaskPrompt(true);
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      alert("Failed to connect wallet. Please try again.");
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-gray-700">
      <div className="w-full max-w-md p-8 space-y-8 bg-gray-800 text-white rounded-3xl shadow-2xl">
        <div className="text-center">
          <Image
            src="/logo-kobe1.png" // Make sure to add your logo to the public folder
            alt="KOBE Logo"
            width={100}
            height={100}
            className="mx-auto mb-4"
          />
          <h1 className="text-5xl font-bold mb-2">KOBE</h1>
          <p className="text-xl text-gray-300">Your web3 developer assistant</p>
        </div>
        <button
          onClick={connectWallet}
          disabled={isConnecting}
          className="w-full py-3 px-4 bg-gradient-to-r from-purple-700 to-blue-700 hover:from-purple-800 hover:to-blue-800 rounded-full text-white font-bold text-lg shadow-lg transform transition duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isConnecting ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Connecting...
            </>
          ) : (
            <>
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              Connect Wallet
            </>
          )}
        </button>
        
        {showMetaMaskPrompt && (
          <div className="mt-4 text-center">
            <p className="text-yellow-400 mb-2">MetaMask is not installed.</p>
            <Link 
              href="https://metamask.io/download/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              Download MetaMask
            </Link>
          </div>
        )}
        
        <div className="mt-6 text-center text-sm">
          <p className="text-gray-400">
            By connecting, you agree to our{' '}
            <Link href="/terms" className="text-blue-400 hover:text-blue-300">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-blue-400 hover:text-blue-300">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
