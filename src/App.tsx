
import { BrowserRouter } from 'react-router-dom';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { AppRoutes } from './router';
import './i18n';

function App() {
  return (
    <TonConnectUIProvider manifestUrl="/tonconnect-manifest.json">
      <BrowserRouter basename={__BASE_PATH__}>
        <div className="min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 touch-manipulation">
          <AppRoutes />
        </div>
      </BrowserRouter>
    </TonConnectUIProvider>
  );
}

export default App;
