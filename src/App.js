import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Plane, Loader, ArrowRight, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

const contractABI = [
  "function playGame() public payable",
  "function TICKET_PRICE() public view returns (uint256)",
  "event GamePlayed(address player, bool won, uint256[3] results)"
];
const contractAddress = "0x8b0b0ca30e2ae09ff2c6bf9beafb72e13936624f";

export default function AerodromeLottery() {
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
          const price = await contract.TICKET_PRICE();
          
          setProvider(provider);
          setContract(contract);
          setAccount(address);
          setTicketPrice(price);

          window.ethereum.on('chainChanged', () => window.location.reload());
        } catch (error) {
          console.error("Error initializing:", error);
          setError(`Connection failed: ${error.message}`);
        }
      } else {
        setError("MetaMask not detected. Please install MetaMask to play.");
      }
    };
    init();
  }, []);

  const playGame = async () => {
    if (contract && ticketPrice) {
      try {
        setIsRolling(true);
        setResult(null);
        setError(null);
        
        const animationInterval = setInterval(() => {
          setSlots([
            Math.floor(Math.random() * 10),
            Math.floor(Math.random() * 10),
            Math.floor(Math.random() * 10)
          ]);
        }, 100);

        const tx = await contract.playGame({ value: ticketPrice });
        const receipt = await tx.wait();
        
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
          setSlots(results.map(n => Number(n)));
          setResult(won);

          if (won) {
            confetti({
              particleCount: 300,
              spread: 180,
              origin: { y: 0.6 }
            });
          }
        } else {
          throw new Error("Game result not found");
        }
      } catch (error) {
        console.error("Game error:", error);
        setError(`Game failed: ${error.message}`);
        setResult(false);
      } finally {
        setIsRolling(false);
      }
    } else {
      setError("Game not ready. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-blue-900 to-cyan-800 text-white font-sans antialiased">
      <div className="container mx-auto px-4 py-8">
        <header className="flex justify-between items-center mb-12">
          <div className="flex items-center space-x-2">
            <Plane className="w-8 h-8" />
            <h1 className="text-3xl font-bold tracking-tight">Aerodrome Lottery</h1>
          </div>
          <div className="text-sm bg-white bg-opacity-10 px-4 py-2 rounded-full">
            {networkName || 'Connecting...'}
          </div>
        </header>

        <main className="max-w-lg mx-auto">
          <div className="bg-white bg-opacity-5 backdrop-blur-lg rounded-3xl p-8 shadow-2xl">
            {error ? (
              <div className="flex items-center justify-center space-x-2 text-red-300 mb-4">
                <AlertCircle className="w-5 h-5" />
                <p>{error}</p>
              </div>
            ) : !provider ? (
              <div className="flex items-center justify-center space-x-2">
                <Loader className="w-5 h-5 animate-spin" />
                <p>Connecting to MetaMask...</p>
              </div>
            ) : (
              <>
                <div className="flex justify-center mb-8">
                  {slots.map((slot, index) => (
                    <div key={index} className="w-20 h-24 mx-1 bg-gradient-to-b from-blue-400 to-blue-600 rounded-lg flex items-center justify-center text-4xl font-bold shadow-lg">
                      {slot}
                    </div>
                  ))}
                </div>
                <button
                  onClick={playGame}
                  disabled={isRolling || !ticketPrice}
                  className={`w-full py-4 px-6 rounded-full flex items-center justify-center space-x-2 text-lg font-semibold transition-all duration-300 ${
                    isRolling || !ticketPrice 
                      ? 'bg-gray-500 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 transform hover:scale-105'
                  }`}
                >
                  {isRolling ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      <span>Flying...</span>
                    </>
                  ) : (
                    <>
                      <span>Take Off</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
                {ticketPrice && (
                  <p className="text-center mt-2 text-sm text-blue-300">
                    Ticket Price: {ethers.formatEther(ticketPrice)} ETH
                  </p>
                )}
                {result !== null && (
                  <div className={`mt-6 p-4 rounded-xl text-center ${result ? 'bg-green-500 bg-opacity-20' : 'bg-red-500 bg-opacity-20'}`}>
                    {result ? (
                      <p className="font-bold text-lg">Congratulations! You've won the jackpot!</p>
                    ) : (
                      <p>Not this time. The skies await your next adventure!</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </main>

        <footer className="mt-12 text-center text-sm text-blue-200 opacity-75">
          <p>&copy; 2024 Aerodrome Lottery. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}