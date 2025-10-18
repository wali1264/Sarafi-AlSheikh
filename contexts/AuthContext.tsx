import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { User, Permissions, PermissionModule, PermissionAction } from '../types';

interface AuthContextType {
    user: User | null;
    login: (user: User) => void;
    logout: () => void;
    hasPermission: (module: PermissionModule, action: PermissionAction) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);

    const login = (userData: User) => {
        setUser(userData);
    };

    const logout = () => {
        setUser(null);
    };

    const hasPermission = useCallback((module: PermissionModule, action: PermissionAction): boolean => {
        if (!user || !user.role || !user.role.permissions) {
            return false;
        }
        const modulePermissions = user.role.permissions[module];
        if (!modulePermissions) {
            return false;
        }
        return modulePermissions[action] === true;
    }, [user]);


    return (
        <AuthContext.Provider value={{ user, login, logout, hasPermission }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
