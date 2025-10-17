import React from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ApiProvider } from './contexts/ApiContext';
import { Role } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './components/Login';
import DashboardPage from './pages/DashboardPage';
import CashboxPage from './pages/CashboxPage';
import DomesticTransfersPage from './pages/DomesticTransfersPage';
import ExpensesPage from './pages/ExpensesPage';
import VoiceAssistant from './components/VoiceAssistant';
import PartnerAccountsPage from './pages/PartnerAccountsPage';
import PartnerAccountDetailPage from './pages/PartnerAccountDetailPage';
import AccountTransfersPage from './pages/AccountTransfersPage';
import ReportsPage from './pages/ReportsPage';
import AmanatPage from './pages/AmanatPage';
import SettingsPage from './pages/SettingsPage';
import PrintableView from './components/PrintableView';
import CustomersPage from './pages/CustomersPage';
import CustomerDetailPage from './pages/CustomerDetailPage';

const App: React.FC = () => {
    return (
        <AuthProvider>
            <ApiProvider>
                <SarrafAIApp />
            </ApiProvider>
        </AuthProvider>
    );
};

const ProtectedRoute: React.FC<{ allowedRoles: Role[] }> = ({ allowedRoles }) => {
    const { user } = useAuth();
    if (!user) {
        return <Navigate to="/" />;
    }
    return allowedRoles.includes(user.role) ? <Outlet /> : <Navigate to="/dashboard" />;
};

const MainLayout: React.FC = () => (
    <div className="flex h-screen bg-[#0D0C22] text-slate-100 font-sans" style={{ direction: 'rtl' }}>
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
            <div id="header-container">
                <Header />
            </div>
            <main className="flex-1 overflow-x-hidden overflow-y-auto p-8">
                <Outlet />
            </main>
        </div>
        <div id="voice-assistant">
            <VoiceAssistant />
        </div>
    </div>
);


const SarrafAIApp: React.FC = () => {
    const { user } = useAuth();
    
    if (!user) {
        return <Login />;
    }

    return (
        <HashRouter>
            <Routes>
                {/* Routes with the main layout */}
                <Route element={<MainLayout />}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/reports" element={<ReportsPage />} />

                    <Route element={<ProtectedRoute allowedRoles={[Role.Manager, Role.Cashier]} />}>
                        <Route path="/cashbox" element={<CashboxPage />} />
                    </Route>

                    <Route element={<ProtectedRoute allowedRoles={[Role.Manager, Role.Domestic_Clerk]} />}>
                        <Route path="/domestic-transfers" element={<DomesticTransfersPage />} />
                        <Route path="/partner-accounts" element={<PartnerAccountsPage />} />
                        <Route path="/partner-accounts/:partnerId" element={<PartnerAccountDetailPage />} />
                    </Route>

                    <Route element={<ProtectedRoute allowedRoles={[Role.Manager, Role.Foreign_Clerk, Role.Domestic_Clerk]} />}>
                        <Route path="/account-transfers" element={<AccountTransfersPage />} />
                    </Route>
                     
                    <Route element={<ProtectedRoute allowedRoles={[Role.Manager, Role.Foreign_Clerk, Role.Domestic_Clerk]} />}>
                        <Route path="/amanat" element={<AmanatPage />} />
                        <Route path="/customers" element={<CustomersPage />} />
                        <Route path="/customers/:customerId" element={<CustomerDetailPage />} />
                    </Route>

                    <Route element={<ProtectedRoute allowedRoles={[Role.Manager]} />}>
                        <Route path="/expenses" element={<ExpensesPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                    </Route>
                    
                    <Route path="*" element={<Navigate to="/dashboard" />} />
                </Route>
                
                {/* Routes without the main layout (e.g., for printing) */}
                <Route path="/print/cashbox/:requestId" element={<PrintableView />} />

            </Routes>
        </HashRouter>
    );
};


export default App;