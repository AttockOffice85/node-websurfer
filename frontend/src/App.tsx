import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import BotsList from './components/BotsList';
import BotInfo from './components/BotInfo';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<BotsList />} />
        <Route path="/logs/:username" element={<BotInfo />} /> {/* New route for bot details */}
      </Routes>
    </Router>
  );
};

export default App;
