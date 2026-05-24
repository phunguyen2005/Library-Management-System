import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import type { UserRole } from '../auth/storage';
import PageLoader from './PageLoader';

export default function ProtectedRoute({
  role,
  roles,
  permission,
  permissions
}: {
  role?: UserRole;
  roles?: UserRole[];
  permission?: string;
  permissions?: string[];
}) {
  const { isAuthReady, isAuthenticated, role: currentRole, hasPermission } = useAuth();

  if (!isAuthReady) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (role && currentRole !== role) {
    const isStaff = currentRole === 'admin' || currentRole === 'librarian';
    return <Navigate to={isStaff ? '/admin/dashboard' : '/home'} replace />;
  }

  if (roles && !roles.includes(currentRole as UserRole)) {
    const isStaff = currentRole === 'admin' || currentRole === 'librarian';
    return <Navigate to={isStaff ? '/admin/dashboard' : '/home'} replace />;
  }

  if (permission && !hasPermission(permission)) {
    const isStaff = currentRole === 'admin' || currentRole === 'librarian';
    return <Navigate to={isStaff ? '/admin/dashboard' : '/home'} replace />;
  }

  if (permissions && !permissions.some(perm => hasPermission(perm))) {
    const isStaff = currentRole === 'admin' || currentRole === 'librarian';
    return <Navigate to={isStaff ? '/admin/dashboard' : '/home'} replace />;
  }

  return <Outlet />;
}
