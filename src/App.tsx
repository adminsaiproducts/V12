import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme';
import { AuthProvider } from './auth/AuthProvider';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AppLayout } from './components/Layout/AppLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Customers } from './pages/Customers';
import { CustomerDetail } from './pages/CustomerDetail';
import { DealList } from './pages/DealList';
import { DealDetail } from './pages/DealDetail';
import { DealNew } from './pages/DealNew';
import { DealEdit } from './pages/DealEdit';
import Masters from './pages/Masters';
import { Relationships } from './pages/Relationships';
import { AdminBatchUpdate } from './pages/AdminBatchUpdate';
import { SalesReport } from './pages/SalesReport';
import { TreeBurialDealList } from './pages/TreeBurialDealList';
import { TreeBurialDealDetail } from './pages/TreeBurialDealDetail';
import { TreeBurialDealEdit } from './pages/TreeBurialDealEdit';
import { BurialPersonList } from './pages/BurialPersonList';
import { BurialPersonDetail } from './pages/BurialPersonDetail';
import { BurialPersonEdit } from './pages/BurialPersonEdit';
import { TreeBurialDealLinkPage } from './pages/TreeBurialDealLinkPage';
import { TreeBurialSummaryByTemple } from './pages/TreeBurialSummaryByTemple';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />

            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<AppLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="customers" element={<Customers />} />
                <Route path="customers/:id" element={<CustomerDetail />} />
                <Route path="deals" element={<DealList />} />
                <Route path="deals/new" element={<DealNew />} />
                <Route path="deals/:id" element={<DealDetail />} />
                <Route path="deals/:id/edit" element={<DealEdit />} />
                <Route path="tree-burial-deals" element={<TreeBurialDealList />} />
                <Route path="tree-burial-deals/new" element={<TreeBurialDealEdit />} />
                <Route path="tree-burial-deals/:id" element={<TreeBurialDealDetail />} />
                <Route path="tree-burial-deals/:id/edit" element={<TreeBurialDealEdit />} />
                <Route path="burial-persons" element={<BurialPersonList />} />
                <Route path="burial-persons/new" element={<BurialPersonEdit />} />
                <Route path="burial-persons/:id" element={<BurialPersonDetail />} />
                <Route path="burial-persons/:id/edit" element={<BurialPersonEdit />} />
                <Route path="masters" element={<Masters />} />
                <Route path="relationships" element={<Relationships />} />
                <Route path="sales-report" element={<SalesReport />} />
                <Route path="tree-burial-summary" element={<TreeBurialSummaryByTemple />} />
                <Route path="admin/batch" element={<AdminBatchUpdate />} />
                <Route path="admin/tree-burial-deal-link" element={<TreeBurialDealLinkPage />} />
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
