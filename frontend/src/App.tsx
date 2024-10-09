import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import BotList from './components/BotList';
import BotInfo from './components/BotInfo';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<BotList />} />
        <Route path="/logs/:username" element={<BotInfo />} /> {/* New route for bot details */}
      </Routes>
    </Router>
  );
};

export default App;
