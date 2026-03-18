import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/auth/LoginPage';
import SignUpPage from './pages/auth/SignUpPage';
import HomePage from './pages/HomePage';
import BuildPage from './pages/BuildPage';
<<<<<<< HEAD
=======
import BuildSuggestions from './pages/BuildSuggestions';
>>>>>>> 6c8128b (Add frontend BuildSuggestions page and interactive question components)
import CameraPage from './pages/CameraPage';
import ResultsPage from './pages/ResultsPage';
import ModelViewerPage from './pages/ModelViewerPage';
import ProtectedRoute from './components/layout/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';
<<<<<<< HEAD
import ManualBuildPage from './pages/ManualBuildPage';
import PurchaseSummaryPage from './pages/PurchaseSummaryPage';
=======
>>>>>>> 6c8128b (Add frontend BuildSuggestions page and interactive question components)
import PlanningPage from './pages/PlanningPage';
import AssemblePage from './pages/AssemblePage';
import TroubleshootPage from './pages/TroubleshootPage';
import MarketplacePage from './pages/MarketplacePage';
import CommunityPage from './pages/CommunityPage';
import UploadBuildPage from './pages/UploadBuildPage';
import EditBuildPage from './pages/EditBuildPage';
import MyBuildsPage from './pages/MyBuildsPage';
import BuildDetailPage from './pages/BuildDetailPage';
import GuidePage from './pages/GuidePage';

import WarrantyPage from './pages/WarrantyPage';
import ProfilePage from './pages/ProfilePage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />

<<<<<<< HEAD
        {/* Protected Routes directly accessible (Build process) */}
        <Route path="/build" element={<ProtectedRoute><BuildPage /></ProtectedRoute>} />
        <Route path="/manual-build" element={<ProtectedRoute><ManualBuildPage /></ProtectedRoute>} />
        <Route path="/purchase-summary" element={<ProtectedRoute><PurchaseSummaryPage /></ProtectedRoute>} />

=======
>>>>>>> 6c8128b (Add frontend BuildSuggestions page and interactive question components)
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
          <Route path="/community/upload" element={<UploadBuildPage />} />
          <Route path="/community/edit/:id" element={<EditBuildPage />} />
          <Route path="/community/my-builds" element={<MyBuildsPage />} />
          <Route path="/community/build/:id" element={<BuildDetailPage />} />
          <Route path="/guide" element={<GuidePage />} />
          <Route path="/warranty" element={<WarrantyPage />} />
          <Route path="/profile" element={<ProfilePage />} />

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