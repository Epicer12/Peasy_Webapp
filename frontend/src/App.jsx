import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/auth/LoginPage';
import SignUpPage from './pages/auth/SignUpPage';
import HomePage from './pages/HomePage';
import BuildPage from './pages/BuildPage';
import BuildSuggestions from './pages/BuildSuggestions';
import CameraPage from './pages/CameraPage';
import ResultsPage from './pages/ResultsPage';
import ModelViewerPage from './pages/ModelViewerPage';
import ProtectedRoute from './components/layout/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';
import PlanningPage from './pages/PlanningPage';
import AssemblePage from './pages/AssemblePage';
import TroubleshootPage from './pages/TroubleshootPage';
import MarketplacePage from './pages/MarketplacePage';
import CommunityPage from './pages/CommunityPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />

        {/* Protected Routes wrapped in MainLayout */}
        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/build" element={<BuildPage />} />
          <Route path="/build-suggestions" element={<BuildSuggestions />} />
          <Route path="/plan" element={<PlanningPage />} />
          <Route path="/assemble" element={<AssemblePage />} />
          <Route path="/troubleshoot" element={<TroubleshootPage />} />
          <Route path="/marketplace" element={<MarketplacePage />} />
          <Route path="/community" element={<CommunityPage />} />

          {/* Sub-features */}
          <Route path="/camera" element={<CameraPage />} />
          <Route path="/result" element={<ResultsPage />} />
          <Route path="/model/:modelId" element={<ModelViewerPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;