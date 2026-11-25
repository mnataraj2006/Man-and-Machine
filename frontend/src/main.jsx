import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './styles/variables.css';
import './styles/typography.css';
import './styles/components.css';
import './styles/global.css';
import './styles/theme.css';
import App from './App.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
