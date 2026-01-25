import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Deals from './pages/Deals';
import Contacts from './pages/Contacts';
import Organizations from './pages/Organizations';
import Notes from './pages/Notes';
import Tasks from './pages/Tasks';

function App() {
  return (
    <Router>
      <div className="flex h-screen bg-gray-100">
        {/* Sidebar hamesha fixed rahega */}
        <Sidebar />
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/leads" element={<Leads />} />
              <Route path="/deals" element={<Deals />} />
              <Route path="/contacts" element={<Contacts />} />
              <Route path="/orgs" element={<Organizations />} />
              <Route path="/tasks" element={<Notes />} />
              
              {/* Baki routes hum sath sath add karenge */}
            <Route path="/todo" element={<Tasks />} />  
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;