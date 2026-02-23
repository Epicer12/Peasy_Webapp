import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/auth/LoginPage';
import SignUpPage from './pages/auth/SignUpPage';
import HomePage from './pages/HomePage';
import BuildPage from "./pages/BuildPage";
import CameraPage from './pages/CameraPage';
import ResultsPage from './pages/ResultsPage';
import ModelViewerPage from './pages/ModelViewerPage';
import ProtectedRoute from './components/layout/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';
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

<<<<<<< HEAD
        {/* Protected Routes */}
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/build"
          element={
            <ProtectedRoute>
              <BuildPage />
            </ProtectedRoute>
          }
        />



        <Route
          path="/camera"
          element={
            <ProtectedRoute>
              <CameraPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/result"
          element={
            <ProtectedRoute>
              <ResultsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/model/:modelId"
          element={
            <ProtectedRoute>
              <ModelViewerPage />
            </ProtectedRoute>
          }
        />
=======
        {/* Protected Routes wrapped in MainLayout */}
        <Route path="/build" element={<ProtectedRoute><BuildPage /></ProtectedRoute>} />
        <Route path="/manual-build" element={<ProtectedRoute><ManualBuildPage /></ProtectedRoute>} />
        <Route path="/purchase-summary" element={<ProtectedRoute><PurchaseSummaryPage /></ProtectedRoute>} />

        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/plan" element={<PlanningPage />} />
          <Route path="/assemble" element={<AssemblePage />} />
          <Route path="/troubleshoot" element={<TroubleshootPage />} />
          <Route path="/marketplace" element={<MarketplacePage />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/guide" element={<GuidePage />} />

          {/* Sub-features */}
          <Route path="/camera" element={<CameraPage />} />
          <Route path="/result" element={<ResultsPage />} />
          <Route path="/model/:modelId" element={<ModelViewerPage />} />
        </Route>
>>>>>>> main
      </Routes>
    </BrowserRouter>
  );
}

export default App;