import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'
import { BrowserRouter } from 'react-router-dom'
import '@solana/wallet-adapter-react-ui/styles.css';


const endpoint = "https://api.devnet.solana.com";
const wallet=[
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter(),
]

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConnectionProvider endpoint={endpoint}>
    <WalletProvider wallets={wallet} autoConnect>
      <WalletModalProvider>
        <BrowserRouter>
    <App />
    </BrowserRouter>
    </WalletModalProvider>
    </WalletProvider>
    </ConnectionProvider>
  </StrictMode>,
)