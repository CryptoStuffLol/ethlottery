import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { AlertTriangle, DollarSign } from 'lucide-react';
import confetti from 'canvas-confetti';

const contractABI = [
  "function playGame() public payable",
  "function TICKET_PRICE() public view returns (uint256)"
];
const contractAddress = "0x8b0b0ca30e2ae09ff2c6bf9beafb72e13936624f"; // Replace with your actual contract address

export default function LotteryGame() {
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [ticketPrice, setTicketPrice] = useState(null);
  const [slots, setSlots] = useState([0, 0, 0]);
  const [isRolling, setIsRolling] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const init = async () => {
      if (typeof window.ethereum !== 'undefined') {
        try {
          await window.ethereum.request({ method: 'eth_requestAccounts' });
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const signer = provider.getSigner();
          const contract = new ethers.Contract(contractAddress, contractABI, signer);
          
          const accounts = await provider.listAccounts();
          const ticketPrice = await contract.TICKET_PRICE();
          
          setProvider(provider);
          setContract(contract);
          setAccount(accounts[0]);
          setTicketPrice(ticketPrice);
        } catch (error) {
          console.error("Error initializing:", error);
          setError("Failed to connect to MetaMask. Please make sure it's installed and unlocked.");
        }
      } else {
        setError("MetaMask not detected. Please install MetaMask to play.");
      }
    };
    init();
  }, []);

  const playGame = async () => {
    if (contract) {
      try {
        setIsRolling(true);
        setResult(null);
        setError(null);
        
        // Animate slots
        for (let i = 0; i < 20; i++) {
          setSlots([
            Math.floor(Math.random() * 10) + 1,
            Math.floor(Math.random() * 10) + 1,
            Math.floor(Math.random() * 10) + 1
          ]);
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Play the game
        const tx = await contract.playGame({ value: ticketPrice });
        await tx.wait();

        // For demo purposes, we'll randomly decide if player won
        // In a real scenario, you'd want to listen for the GamePlayed event
        const won = Math.random() < 0.1;  // 10% chance of winning
        
        setSlots(won ? [7, 7, 7] : [
          Math.floor(Math.random() * 10) + 1,
          Math.floor(Math.random() * 10) + 1,
          Math.floor(Math.random() * 10) + 1
        ]);

        setResult(won);
        
        if (won) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
        }
      } catch (error) {
        console.error("Error playing game:", error);
        setError("Failed to play the game. Make sure you're connected to the Base Goerli testnet and have enough ETH.");
        setResult(false);
      } finally {
        setIsRolling(false);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
      <h1 className="text-4xl font-bold mb-8 text-white">ETH Lottery on Base</h1>
      <div className="bg-white p-8 rounded-lg shadow-lg">
        {error ? (
          <div className="text-red-500 mb-4">{error}</div>
        ) : !provider ? (
          <div className="text-center p-4">Connecting to MetaMask...</div>
        ) : (
          <>
            <div className="flex justify-around mb-4">
              {slots.map((slot, index) => (
                <div key={index} className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center text-4xl font-bold">
                  {slot}
                </div>
              ))}
            </div>
            <button
              onClick={playGame}
              disabled={isRolling}
              className={`w-full py-2 px-4 rounded ${
                isRolling ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'
              } text-white font-bold transition duration-200`}
            >
              {isRolling ? 'Rolling...' : 'Play (0.0001 ETH)'}
            </button>
            {result !== null && (
              <div className={`mt-4 p-2 rounded ${result ? 'bg-green-100' : 'bg-red-100'}`}>
                {result ? (
                  <div className="flex items-center text-green-800">
                    <DollarSign className="mr-2" />
                    You won! Congratulations!
                  </div>
                ) : (
                  <div className="flex items-center text-red-800">
                    <AlertTriangle className="mr-2" />
                    Sorry, you lost. Try again!
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}