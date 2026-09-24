import React from 'react';
import ReactDOM from 'react-dom/client';
import { BudgetProvider } from './context/BudgetContext';
import { BudgetAppContent } from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BudgetProvider>
      <BudgetAppContent />
    </BudgetProvider>
  </React.StrictMode>
);
