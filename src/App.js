import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import ChatPage from './pages/ChatPage';
import PersonInfoPage from './pages/PersonInfoPage';
import backgroundImage from './assets/H1.png';
import { ChatProvider } from './context/ChatContext';
import Page from './pages/NetworkPage';

function App() {
  return (
    <ChatProvider>
      <Router>
        <div className="flex flex-col h-screen">

          <Routes>
            <Route path="/" element={<ChatPage />} />
            <Route path="/personinfo" element={<PersonInfoPage />} />
            <Route path="/network" element={<Page />} />
          </Routes>
        </div>
      </Router>
    </ChatProvider>
  );
}

export default App;