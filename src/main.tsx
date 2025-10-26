
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { tonWalletService } from './services/tonService';
import { referralService } from './services/referralService';

// Enhanced TON Connect initialization
const initializeTonConnect = async () => {
  try {
    // Wait for TON Connect UI to be available
    if (typeof window !== 'undefined' && (window as any).TonConnectUI) {
      const TonConnectUI = (window as any).TonConnectUI;
      
      // Initialize with proper configuration
      const tonConnectUI = new TonConnectUI({
        manifestUrl: window.location.origin + '/tonconnect-manifest.json',
        buttonRootId: null, // We'll handle the button manually
        uiPreferences: {
          theme: 'LIGHT',
          borderRadius: 'm',
          colorsSet: {
            [TonConnectUI.THEME.LIGHT]: {
              connectButton: {
                background: '#0098EA',
                foreground: '#FFFFFF'
              },
              accent: '#0098EA',
              telegramButton: '#0088CC'
            }
          }
        },
        walletsListConfiguration: {
          includeWallets: [
            {
              name: 'Tonkeeper',
              aboutUrl: 'https://tonkeeper.com',
              imageUrl: 'https://tonkeeper.com/assets/tonconnect-icon.png',
              tondns: 'tonkeeper.ton',
              platforms: ['ios', 'android', 'chrome', 'firefox']
            },
            {
              name: 'OpenMask',
              aboutUrl: 'https://www.openmask.app/',
              imageUrl: 'https://www.openmask.app/img/logo.png',
              platforms: ['chrome']
            },
            {
              name: 'MyTonWallet',
              aboutUrl: 'https://mytonwallet.io',
              imageUrl: 'https://mytonwallet.io/icon-256.png',
              platforms: ['chrome', 'ios', 'android']
            }
          ]
        },
        actionsConfiguration: {
          skipRedirectToWallet: 'never',
          returnStrategy: 'back',
          twaReturnUrl: window.location.origin
        }
      });

      // Initialize wallet service with enhanced configuration
      tonWalletService.initialize(tonConnectUI);
      
      console.log('✅ TON Connect initialized successfully');
      console.log('🔗 Manifest URL:', window.location.origin + '/tonconnect-manifest.json');
      
      // Make tonConnectUI globally available
      (window as any).tonConnectUI = tonConnectUI;
      
    } else {
      console.warn('⚠️ TonConnectUI not available, retrying...');
      setTimeout(initializeTonConnect, 1000);
    }
  } catch (error) {
    console.error('❌ Failed to initialize TON Connect:', error);
    setTimeout(initializeTonConnect, 2000);
  }
};

// Initialize services
tonWalletService.loadFromStorage();
referralService.loadFromStorage();

// Initialize TON Connect when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeTonConnect);
} else {
  initializeTonConnect();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
