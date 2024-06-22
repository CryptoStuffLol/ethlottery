import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { AlertTriangle, DollarSign } from 'lucide-react';
import confetti from 'canvas-confetti';

const contractABI = [
  "function playGame() public payable",
  "function TICKET_PRICE() public view returns (uint256)",
  "event GamePlayed(address player, bool won, uint256[3] results)"
];
const contractAddress = "0x8b0b0ca30e2ae09ff2c6bf9beafb72e13936624f";

export default function LotteryGame() {
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [ticketPrice, setTicketPrice] = useState(null);
  const [slots, setSlots] = useState([0, 0, 0]);
  const [isRolling, setIsRolling] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [networkName, setNetworkName] = useState(null);

  useEffect(() => {
    const init = async () => {
      if (typeof window.ethereum !== 'undefined') {
        try {
          await window.ethereum.request({ method: 'eth_requestAccounts' });
          const provider = new ethers.BrowserProvider(window.ethereum);
          const network = await provider.getNetwork();
          setNetworkName(network.name);
          
          const signer = await provider.getSigner();
          const contract = new ethers.Contract(contractAddress, contractABI, signer);
          
          const address = await signer.getAddress();
          const ticketPrice = await contract.TICKET_PRICE();
          
          setProvider(provider);
          setContract(contract);
          setAccount(address);
          setTicketPrice(ticketPrice);

          window.ethereum.on('chainChanged', () => window.location.reload());
        } catch (error) {
          console.error("Error initializing:", error);
          setError(`Failed to connect: ${error.message}`);
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
        
        const animationInterval = setInterval(() => {
          setSlots([
            Math.floor(Math.random() * 10) + 1,
            Math.floor(Math.random() * 10) + 1,
            Math.floor(Math.random() * 10) + 1
          ]);
        }, 100);

        const tx = await contract.playGame({ value: ticketPrice });
        console.log("Transaction hash:", tx.hash);
        
        const receipt = await tx.wait();
        console.log("Transaction receipt:", receipt);
        
        clearInterval(animationInterval);

        const gamePlayedEvent = receipt.logs
          .map(log => {
            try {
              return contract.interface.parseLog({
                topics: log.topics,
                data: log.data
              });
            } catch (e) {
              return null;
            }
          })
          .find(event => event && event.name === 'GamePlayed');

        if (gamePlayedEvent) {
          const [player, won, results] = gamePlayedEvent.args;
          console.log("Game results:", { player, won, results });

          // Safely convert BigInt to number
          const safeToNumber = (value) => {
            if (typeof value === 'bigint') {
              return Number(value);
            } else if (typeof value.toNumber === 'function') {
              return value.toNumber();
            } else if (typeof value === 'number') {
              return value;
            }
            throw new Error(`Unable to convert ${value} to number`);
          };

          setSlots(results.map(safeToNumber));
          setResult(won);

          if (won) {
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 }
            });
          }
        } else {
          throw new Error("GamePlayed event not found in transaction logs");
        }

      } catch (error) {
        console.error("Error playing game:", error);
        setError(`Failed to play the game: ${error.message}`);
        setResult(false);
      } finally {
        setIsRolling(false);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
      <h1 className="text-4xl font-bold mb-8 text-white">ETH Lottery on Base Sepolia</h1>
      <div className="bg-white p-8 rounded-lg shadow-lg">
        {error ? (
          <div className="text-red-500 mb-4">{error}</div>
        ) : !provider ? (
          <div className="text-center p-4">Connecting to MetaMask...</div>
        ) : (
          <>
            <div className="text-center mb-4">
              Connected to: {networkName || 'Unknown Network'}
            </div>
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
              {isRolling ? 'Rolling...' : `Play (${ethers.formatEther(ticketPrice || 0)} ETH)`}
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