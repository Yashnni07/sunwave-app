import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Forbidden from './pages/ForbiddenAccess/ForbiddenAccessPage';
import AdminEvents from './pages/AdminDashboardEvents/AdminEvents';
import DelFlaggedPost from './pages/AdminDashboardPosts/DelFlaggedPost';
import AdminSettingsPage from './pages/AdminDashboardSettings/AdminSettingsPage';
import AdminUserPage from './pages/AdminDashboardUsers/AdminUserPage';
import AdminUploadEventPage from './pages/AdminUploadEvent/AdminUploadEventPage';
import UploadEventPage from './pages/UploadEvent/UploadEventPage';
import UploadVotingPage from './pages/UploadEvent/UploadVotingPage';
import AdminProfile from './pages/Profiles/AdminProfilePage';
import ModProfilePage from './pages/Profiles/ModeratorProfilePage';
import CommentSec from './pages/Comment/CommentSec';
import EventPage from './pages/Event/EventPage';
import Forum from './pages/Forum/Forum';
import LoginPage from './pages/Login/LoginPage';
import OtpPage from './pages/Otp/OtpPage';
import Register from './pages/Register/Register';
import TopBarAndSidebar from './pages/sidebar';
import ProfilePage from './pages/Profiles/ProfilePage';
import JoinedEventsPage from './pages/JoinedEvent';
import CreatedPost from './pages/CreatedPost/CreatedPost';
import SavedPost from './pages/SavedPost/SavedPostPage';
import ModUploadEventPage from './pages/ModUploadEvent/ModUploadEventPage';
import CreatedEvent from './pages/CreatedEvent/CreatedEvent';

// Layout Component
const Layout = ({ children }) => {
    const location = useLocation();
    const excludedRoutes = ['/login', '/', '/otp'];
    const showSidebar = !excludedRoutes.includes(location.pathname);

    return (
        <>
            {showSidebar && <TopBarAndSidebar />}
            <div className={showSidebar ? 'main-content' : ''}>{children}</div>
        </>
    );
};

// Protected Route Component with RBAC
const ProtectedRoute = ({ children, allowedRoles, userRole, isAuthenticated }) => {
    console.log('ProtectedRoute Props:', { allowedRoles, userRole, isAuthenticated });

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (userRole === null || userRole === undefined) {
        // Show a loading indicator until `role` is set
        return <div>Loading...</div>;
    }

    if (!allowedRoles.includes(userRole)) {
        return <Navigate to="/forbidden" replace />;
    }

    return children;
};

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [role, setRole] = useState(null); // User role: 'Admin', 'Moderator', 'User'
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            axios
                .get('http://localhost:5000/validate-token', {
                    headers: { Authorization: `Bearer ${token}` },
                })
                .then((response) => {
                    setIsAuthenticated(true);
                    setRole(response.data.user.role); // Assume backend sends role as part of user object
                })
                .catch(() => {
                    localStorage.removeItem('token');
                    setIsAuthenticated(false);
                    setRole(null);
                })
                .finally(() => setLoading(false));
        } else {
            setIsAuthenticated(false);
            setLoading(false);
        }
    }, []);

    const handleLogin = (status, role) => {
        setIsAuthenticated(status);
        setRole(role);
        window.location.href = '/forum';
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <Router>
            <Layout>
                <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<Register />} />
                    <Route path="/otp" element={<OtpPage />} />
                    <Route
                        path="/login"
                        element={<LoginPage setUserAuthenticated={handleLogin} />}
                    />

                    {/* Role-Based Protected Routes */}
                    {/* Admin */}
                    <Route
                        path="/admin-profile"
                        element={
                            <ProtectedRoute
                                allowedRoles={['Admin']}
                                userRole={role}
                                isAuthenticated={isAuthenticated}
                            >
                                <AdminProfile />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin-events"
                        element={
                            <ProtectedRoute
                                allowedRoles={['Admin']}
                                userRole={role}
                                isAuthenticated={isAuthenticated}
                            >
                                <AdminEvents />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/del-flagged-posts"
                        element={
                            <ProtectedRoute
                                allowedRoles={['Admin']}
                                userRole={role}
                                isAuthenticated={isAuthenticated}
                            >
                                <DelFlaggedPost />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin-settings"
                        element={
                            <ProtectedRoute
                                allowedRoles={['Admin']}
                                userRole={role}
                                isAuthenticated={isAuthenticated}
                            >
                                <AdminSettingsPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin-users"
                        element={
                            <ProtectedRoute
                                allowedRoles={['Admin']}
                                userRole={role}
                                isAuthenticated={isAuthenticated}
                            >
                                <AdminUserPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin-upload-event"
                        element={
                            <ProtectedRoute
                                allowedRoles={['Admin']}
                                userRole={role}
                                isAuthenticated={isAuthenticated}
                            >
                                <AdminUploadEventPage />
                            </ProtectedRoute>
                        }
                    />
                    {/* Moderator */}
                    <Route
                        path="/mod-profile"
                        element={
                            <ProtectedRoute
                                allowedRoles={['Moderator']}
                                userRole={role}
                                isAuthenticated={isAuthenticated}
                            >
                                <ModProfilePage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/mod-upload-event"
                        element={
                            <ProtectedRoute
                                allowedRoles={['Moderator']}
                                userRole={role}
                                isAuthenticated={isAuthenticated}
                            >
                                <ModUploadEventPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/created-events"
                        element={
                            <ProtectedRoute
                                allowedRoles={['Moderator']}
                                userRole={role}
                                isAuthenticated={isAuthenticated}
                            >
                                <CreatedEvent />
                            </ProtectedRoute>
                        }
                    />

                    {/* General User */}
                    <Route
                        path="/forum"
                        element={
                            <ProtectedRoute
                                allowedRoles={['User', 'Moderator', 'Admin']}
                                userRole={role}
                                isAuthenticated={isAuthenticated}
                            >
                                <Forum />
                            </ProtectedRoute>
                        }
                    />
                     <Route
                        path="/created-posts"
                        element={
                            <ProtectedRoute
                                allowedRoles={['User', 'Moderator', 'Admin']}
                                userRole={role}
                                isAuthenticated={isAuthenticated}
                            >
                                <CreatedPost />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/saved"
                        element={
                            <ProtectedRoute
                                allowedRoles={['User', 'Moderator', 'Admin']}
                                userRole={role}
                                isAuthenticated={isAuthenticated}
                            >
                                <SavedPost />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/profile"
                        element={
                            <ProtectedRoute
                                allowedRoles={['User']}
                                userRole={role}
                                isAuthenticated={isAuthenticated}
                            >
                                <ProfilePage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/comments"
                        element={
                            <ProtectedRoute
                                allowedRoles={['User', 'Moderator', 'Admin']}
                                userRole={role}
                                isAuthenticated={isAuthenticated}
                            >
                                <CommentSec />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/events"
                        element={
                            <ProtectedRoute
                                allowedRoles={['User', 'Moderator', 'Admin']}
                                userRole={role}
                                isAuthenticated={isAuthenticated}
                            >
                                <EventPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/joined-events"
                        element={
                            <ProtectedRoute
                                allowedRoles={['User', 'Moderator']}
                                userRole={role}
                                isAuthenticated={isAuthenticated}
                            >
                                <JoinedEventsPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/mod-upload-event"
                        element={
                            <ProtectedRoute
                                allowedRoles={['Moderator']}
                                userRole={role}
                                isAuthenticated={isAuthenticated}
                            >
                                <ModUploadEventPage />
                            </ProtectedRoute>
                        }
                    />
                    {/* Forbidden Page */}
                    <Route path="/forbidden" element={<Forbidden />} />
                    <Route path="*" element={<Navigate to="/forbidden" replace />} />
                </Routes>
            </Layout>
        </Router>
    );
}

export default App;
