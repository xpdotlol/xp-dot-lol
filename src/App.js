import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { PrivyProvider } from '@privy-io/react-auth';
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';
import './App.css';
import Header from './components/Header';
import XPerpetuals from './components/XPerpetuals';
import Pledge from './components/Pledge';
import Referral from './components/Referral';
import Rewards from './components/Rewards';

// Initialize Solana wallet connectors
const solanaConnectors = toSolanaWalletConnectors({
  shouldAutoConnect: true,
});

function App() {
  return (
    <PrivyProvider
      appId="cmg16uhh00026la0d4kzy14bt"
      clientId="client-WY6RPuHuSkwj1RBfN1sdMLTFpbepp1BnFfS2udcHr2jC8"
      config={{
        loginMethods: ['email', 'wallet'],
        appearance: {
          theme: '#121212',
          accentColor: '#BBBBBB',
          walletChainType: 'solana-only',
          walletList: ['detected_solana_wallets'],
        },
        externalWallets: {
          solana: {
            connectors: solanaConnectors,
          },
        },
      }}
    >
      <Router>
        <div className="App">
          <Header />
          <Routes>
            <Route path="/" element={<Navigate to="/market" replace />} />
            <Route path="/market" element={<XPerpetuals />} />
            <Route path="/pledge" element={<Pledge />} />
            <Route path="/refer" element={<Referral />} />
            <Route path="/reward" element={<Rewards />} />
          </Routes>
        </div>
      </Router>
    </PrivyProvider>
  );
}

export default App;