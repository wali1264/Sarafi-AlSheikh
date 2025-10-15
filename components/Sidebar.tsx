import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Role } from '../types';

const allNavLinks = [
    { to: '/dashboard', label: 'داشبورد', roles: [Role.Manager, Role.Cashier, Role.Domestic_Clerk, Role.Foreign_Clerk] },
    { to: '/cashbox', label: 'صندوق', roles: [Role.Manager, Role.Cashier] },
    { to: '/domestic-transfers', label: 'حواله جات داخلی', roles: [Role.Manager, Role.Domestic_Clerk] },
    { to: '/foreign-transfers', label: 'حواله جات خارجی', roles: [Role.Manager, Role.Foreign_Clerk] },
    { to: '/amanat', label: 'امانات', roles: [Role.Manager, Role.Foreign_Clerk, Role.Domestic_Clerk] },
    { to: '/partner-accounts', label: 'حساب همکاران', roles: [Role.Manager, Role.Domestic_Clerk] },
    { to: '/expenses', label: 'مصارف', roles: [Role.Manager] },
    { to: '/reports', label: 'گزارشات', roles: [Role.Manager, Role.Cashier, Role.Domestic_Clerk, Role.Foreign_Clerk] },
];


const Sidebar: React.FC = () => {
    const { user } = useAuth();

    const visibleLinks = allNavLinks.filter(link => user && link.roles.includes(user.role));

    const baseLinkClass = "flex items-center px-6 py-4 text-xl font-medium rounded-r-lg transition-colors duration-200";
    const inactiveLinkClass = "text-slate-400 hover:bg-cyan-400/10 hover:text-slate-100";
    const activeLinkClass = "bg-cyan-400/20 text-cyan-300 font-bold border-r-4 border-cyan-400";

    return (
        <aside className="w-80 bg-[#0A091A] flex-shrink-0" style={{ direction: 'rtl' }}>
            <div className="h-24 flex items-center justify-center border-b-2 border-cyan-400/20">
                <h1 className="text-5xl font-bold tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 to-fuchsia-500" style={{'--tw-text-opacity': 1, textShadow: '0 0 10px rgba(0, 255, 255, 0.3)'} as React.CSSProperties}>
                    SarrafAI
                </h1>
            </div>
            <nav className="mt-10 pr-4">
                <ul>
                    {visibleLinks.map(link => (
                        <li key={link.to}>
                            <NavLink
                                to={link.to}
                                className={({ isActive }) => `${baseLinkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}
                            >
                                {link.label}
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>
        </aside>
    );
};

export default Sidebar;