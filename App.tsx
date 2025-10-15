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
import ForeignTransfersPage from './pages/ForeignTransfersPage';
import ReportsPage from './pages/ReportsPage';
import AmanatPage from './pages/AmanatPage';

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

const SarrafAIApp: React.FC = () => {
    const { user } = useAuth();
    
    if (!user) {
        return <Login />;
    }

    return (
        <HashRouter>
            <div className="flex h-screen bg-[#0D0C22] text-slate-100 font-sans" style={{ direction: 'rtl' }}>
                <Sidebar />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div id="header-container">
                        <Header />
                    </div>
                    <main className="flex-1 overflow-x-hidden overflow-y-auto p-8">
                        <Routes>
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

                            <Route element={<ProtectedRoute allowedRoles={[Role.Manager, Role.Foreign_Clerk]} />}>
                                <Route path="/foreign-transfers" element={<ForeignTransfersPage />} />
                            </Route>
                             
                            <Route element={<ProtectedRoute allowedRoles={[Role.Manager, Role.Foreign_Clerk, Role.Domestic_Clerk]} />}>
                                <Route path="/amanat" element={<AmanatPage />} />
                            </Route>

                            <Route element={<ProtectedRoute allowedRoles={[Role.Manager]} />}>
                                <Route path="/expenses" element={<ExpensesPage />} />
                            </Route>
                            
                            <Route path="*" element={<Navigate to="/dashboard" />} />
                        </Routes>
                    </main>
                </div>
                <div id="voice-assistant">
                    <VoiceAssistant />
                </div>
            </div>
        </HashRouter>
    );
};


export default App;