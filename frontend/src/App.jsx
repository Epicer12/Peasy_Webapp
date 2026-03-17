import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/auth/LoginPage';
import SignUpPage from './pages/auth/SignUpPage';
import HomePage from './pages/HomePage';
import BuildPage from './pages/BuildPage';
import BuildSuggestions from './pages/BuildSuggestions'; // Kept from feature branch
import CameraPage from './pages/CameraPage';
import ResultsPage from './pages/ResultsPage';
import ModelViewerPage from './pages/ModelViewerPage';
import ProtectedRoute from './components/layout/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';

// New pages integrated from development branch
import ManualBuildPage from './pages/ManualBuildPage';
import PurchaseSummaryPage from './pages/PurchaseSummaryPage';

import PlanningPage from './pages/PlanningPage';
import AssemblePage from './pages/AssemblePage';
import TroubleshootPage from './pages/TroubleshootPage';
import MarketplacePage from './pages/MarketplacePage';
import CommunityPage from './pages/CommunityPage';
import GuidePage from './pages/GuidePage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />

        {/* 
            Protected Routes directly accessible
            Integrated Manual Build and Purchase Summary from development branch
        */}
        <Route path="/manual-build" element={<ProtectedRoute><ManualBuildPage /></ProtectedRoute>} />
        <Route path="/purchase-summary" element={<ProtectedRoute><PurchaseSummaryPage /></ProtectedRoute>} />

        {/* 
            Protected Routes wrapped in MainLayout
            MainLayout provides the navigation sidebar required for the feature branch UI
        */}
        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/build" element={<BuildPage />} />
          <Route path="/build-suggestions" element={<BuildSuggestions />} />
          <Route path="/plan" element={<PlanningPage />} />
          <Route path="/assemble" element={<AssemblePage />} />
          <Route path="/troubleshoot" element={<TroubleshootPage />} />
          <Route path="/marketplace" element={<MarketplacePage />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/guide" element={<GuidePage />} />
          <Route path="/guide" element={<GuidePage />} />

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