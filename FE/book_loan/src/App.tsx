import React, { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import PageLoader from './components/PageLoader';
import ProtectedRoute from './components/ProtectedRoute';

const AdminLayout = lazy(() => import('./layouts/AdminLayout'));
const UserLayout = lazy(() => import('./layouts/UserLayout'));
const Landing = lazy(() => import('./pages/public/Landing'));
const Login = lazy(() => import('./pages/auth/Login'));
const VerifyOtp = lazy(() => import('./pages/auth/VerifyOtp'));
const OAuthCallback = lazy(() => import('./pages/auth/OAuthCallback'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const NotFound = lazy(() => import('./pages/public/NotFound'));
const Blog = lazy(() => import('./pages/public/Blog'));
const BlogPost = lazy(() => import('./pages/public/BlogPost'));
const TermsOfUse = lazy(() => import('./pages/public/TermsOfUse'));
const PrivacyPolicy = lazy(() => import('./pages/public/PrivacyPolicy'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminInventory = lazy(() => import('./pages/admin/AdminInventory'));
const AdminMembers = lazy(() => import('./pages/admin/AdminMembers'));
const AdminReports = lazy(() => import('./pages/admin/AdminReports'));
const AdminRequests = lazy(() => import('./pages/admin/AdminRequests'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const AdminAuditLogs = lazy(() => import('./pages/admin/AdminAuditLogs'));
const AdminFines = lazy(() => import('./pages/admin/AdminFines'));
const Catalog = lazy(() => import('./pages/student/Catalog'));
const Digital = lazy(() => import('./pages/student/Digital'));
const History = lazy(() => import('./pages/student/History'));
const Home = lazy(() => import('./pages/student/Home'));
const MyBooks = lazy(() => import('./pages/student/MyBooks'));
const StudentRequests = lazy(() => import('./pages/student/StudentRequests'));
const StudentSettings = lazy(() => import('./pages/student/StudentSettings'));
const Favorites = lazy(() => import('./pages/student/Favorites'));
const StudentFines = lazy(() => import('./pages/student/Fines'));
const Gamification = lazy(() => import('./pages/student/Gamification'));
const MomoMockCheckout = lazy(() => import('./pages/student/MomoMockCheckout'));
const VnpayMockCheckout = lazy(() => import('./pages/student/VnpayMockCheckout'));
const RoomBookingPage = lazy(() => import('./pages/student/RoomBooking'));
const AdminRoomBookings = lazy(() => import('./pages/admin/AdminRoomBookings'));
const AdminLibrarians = lazy(() => import('./pages/admin/AdminLibrarians'));
const BlogManagement = lazy(() => import('./pages/admin/BlogManagement'));

export default function App() {
  const { isAuthReady, isAuthenticated, role, user } = useAuth();
  const homePath = (role === 'admin' || role === 'librarian') ? '/admin/dashboard' : '/home';

  const isOutlookStudent = !!(user?.email && (
    user.email.toLowerCase().endsWith('@student.hcmue.edu.vn') || 
    user.email.toLowerCase().endsWith('@hcmue.edu.vn')
  ));
  const isGuest = role === 'student' && !isOutlookStudent;

  if (!isAuthReady) {
    return <PageLoader />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/terms" element={<TermsOfUse />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/login" element={isAuthenticated ? <Navigate to={homePath} replace /> : <Login />} />
        <Route path="/verify-otp" element={isAuthenticated ? <Navigate to={homePath} replace /> : <VerifyOtp />} />
        <Route path="/forgot-password" element={isAuthenticated ? <Navigate to={homePath} replace /> : <ForgotPassword />} />
        <Route path="/oauth-callback" element={isAuthenticated ? <Navigate to={homePath} replace /> : <OAuthCallback />} />

        <Route element={<ProtectedRoute role="student" />}>
          <Route path="/momo-mockup-checkout" element={<MomoMockCheckout />} />
          <Route path="/vnpay-mockup-checkout" element={<VnpayMockCheckout />} />
          <Route element={<UserLayout />}>
            <Route path="/home" element={<Home />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/my-books" element={<MyBooks />} />
            <Route path="/digital" element={<Digital />} />
            <Route path="/requests" element={isGuest ? <Navigate to="/home" replace /> : <StudentRequests />} />
            <Route path="/room-booking" element={isGuest ? <Navigate to="/home" replace /> : <RoomBookingPage />} />
            <Route path="/history" element={isGuest ? <Navigate to="/home" replace /> : <History />} />
            <Route path="/fines" element={isGuest ? <Navigate to="/home" replace /> : <StudentFines />} />
            <Route path="/gamify" element={<Gamification />} />
            <Route path="/settings" element={<StudentSettings />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={['admin', 'librarian']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />

            <Route element={<ProtectedRoute permission="manage_books" />}>
              <Route path="inventory" element={<AdminInventory />} />
            </Route>
            <Route element={<ProtectedRoute permission="approve_requests" />}>
              <Route path="requests" element={<AdminRequests />} />
            </Route>
            <Route element={<ProtectedRoute permission="manage_members" />}>
              <Route path="members" element={<AdminMembers />} />
            </Route>
            <Route element={<ProtectedRoute permissions={['manage_fines', 'waive_fines']} />}>
              <Route path="fines" element={<AdminFines />} />
            </Route>
            <Route element={<ProtectedRoute permission="manage_rooms" />}>
              <Route path="room-bookings" element={<AdminRoomBookings />} />
            </Route>
            <Route element={<ProtectedRoute permission="view_reports" />}>
              <Route path="reports" element={<AdminReports />} />
            </Route>
            <Route element={<ProtectedRoute permission="view_audit_logs" />}>
              <Route path="audit-logs" element={<AdminAuditLogs />} />
            </Route>
            <Route element={<ProtectedRoute permission="manage_settings" />}>
              <Route path="settings" element={<AdminSettings />} />
            </Route>
            <Route element={<ProtectedRoute permission="manage_librarians" />}>
              <Route path="librarians" element={<AdminLibrarians />} />
            </Route>
            <Route element={<ProtectedRoute permission="manage_blog" />}>
              <Route path="blog" element={<BlogManagement />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
