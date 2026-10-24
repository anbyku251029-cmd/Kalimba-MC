import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { pwaManager } from './utils/pwaManager';

// PWA 서비스 워커 등록
pwaManager.registerServiceWorker();

createRoot(document.getElementById('root')!).render(<App />);
