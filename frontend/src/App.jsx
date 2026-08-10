import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import BookingPage from './pages/BookingPage';
import RegisterPage from './pages/RegisterPage';
import MyAppointmentsPage from './pages/MyAppointmentsPage.jsx';
import AdminAppointmentsPage from './pages/AdminAppointmentsPage';
import AdminCatalogPage from './pages/AdminCatalogPage';
import AdminSettingsPage from './pages/AdminSettingsPage';
import AdminEmployeesPage from './pages/AdminEmployeesPage';


function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Navbar />
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route
                        path="/admin/dashboard"
                        element={
                            <ProtectedRoute requiredRole="ADMIN">
                                <DashboardPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/book"
                        element={
                            <ProtectedRoute>
                                <BookingPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/appointments"
                        element={
                            <ProtectedRoute>
                                <MyAppointmentsPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route
                        path="/admin/appointments"
                        element={
                            <ProtectedRoute requiredRole="ADMIN">
                                <AdminAppointmentsPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/catalog"
                        element={
                            <ProtectedRoute requiredRole="ADMIN">
                                <AdminCatalogPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/settings"
                        element={
                            <ProtectedRoute requiredRole="ADMIN">
                                <AdminSettingsPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/employees"
                        element={
                            <ProtectedRoute requiredRole="ADMIN">
                                <AdminEmployeesPage />
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;