import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { roleTranslations } from '../utils/translations';
import { useApi } from '../hooks/useApi';
import { User } from '../types';

const Login: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const { login } = useAuth();
    const api = useApi();

    useEffect(() => {
        const fetchUsers = async () => {
            const userList = await api.getUsers();
            setUsers(userList);
            if (userList.length > 0) {
                setSelectedUserId(userList[0].id);
            }
        };
        fetchUsers();
    }, [api]);


    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        const user = users.find(u => u.id === selectedUserId);
        if (user) {
            login(user);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0D0C22] p-4 font-sans">
            <div 
                className="w-full max-w-lg p-10 space-y-8 bg-[#12122E]/80 backdrop-blur-sm border-2 border-cyan-400/30"
                style={{
                    clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)',
                    boxShadow: '0 0 40px rgba(0, 255, 255, 0.2)'
                }}
            >
                <div className="text-center space-y-2">
                    <h1 className="text-7xl font-bold tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 to-fuchsia-500" style={{'--tw-text-opacity': 1, textShadow: '0 0 15px rgba(0, 255, 255, 0.4)'} as React.CSSProperties}>
                        SarrafAI
                    </h1>
                    <p className="text-slate-400 text-xl">لطفاً برای ورود یک کاربر را انتخاب کنید</p>
                </div>
                <form onSubmit={handleLogin} className="space-y-8">
                    <div>
                        <label htmlFor="user-select" className="block text-lg font-medium text-cyan-300 mb-2 text-right tracking-wider">
                            انتخاب کاربر
                        </label>
                        <div className="relative">
                            <select
                                id="user-select"
                                value={selectedUserId}
                                onChange={(e) => setSelectedUserId(e.target.value)}
                                className="w-full appearance-none text-xl px-4 py-3 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right transition-colors duration-300"
                            >
                                {users.map(user => (
                                    <option key={user.id} value={user.id}>
                                        {user.name} ({roleTranslations[user.role]})
                                    </option>
                                ))}
                            </select>
                             <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-2 text-slate-400">
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                            </div>
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={!selectedUserId}
                        className="w-full py-4 px-4 text-2xl font-bold tracking-widest text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105 disabled:opacity-50"
                        style={{
                            clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)',
                             boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)'
                        }}
                    >
                        ورود
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;