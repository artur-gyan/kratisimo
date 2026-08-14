import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BusinessProvider } from './context/BusinessContext';
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
import EmployeePage from './pages/EmployeePage';
import AdminCustomersPage from './pages/AdminCustomersPage';

/**
 * Το "/" προσαρμόζεται στον ρόλο:
 *  - ADMIN → ημερολόγιο ραντεβού
 *  - EMPLOYEE → το πρόγραμμά του
 *  - CUSTOMER + ανώνυμος → landing (η αρχική "πρόσωπο" του μαγαζιού)
 */
function HomeRedirect() {
    const { user, loading } = useAuth();

    if (loading) return null;

    const isAdmin = user?.roles.includes('ADMIN');
    const isEmployee = user?.roles.includes('EMPLOYEE');

    if (isAdmin) {
        return <Navigate to="/admin/appointments" replace />;
    }
    if (isEmployee) {
        return <Navigate to="/employee" replace />;
    }
    // Customer + ανώνυμος → landing.
    return <HomePage />;
}

function App() {
    return (
        <AuthProvider>
            <BusinessProvider>
                <BrowserRouter>
                    <Navbar />
                    <Routes>
                        <Route path="/" element={<HomeRedirect />} />
                        <Route path="/login" element={<LoginPage />} />
                        <Route
                            path="/admin/dashboard"
                            element={
                                <ProtectedRoute requiredRole="ADMIN">
                                    <DashboardPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route path="/book" element={<BookingPage />} />
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
                        <Route
                            path="/employee"
                            element={
                                <ProtectedRoute requiredRole="EMPLOYEE">
                                    <EmployeePage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/customers"
                            element={
                                <ProtectedRoute requiredRole="ADMIN">
                                    <AdminCustomersPage />
                                </ProtectedRoute>
                            }
                        />
                    </Routes>

                    {/* Global footer — διακριτικό platform branding */}
                    <footer className="text-center py-6 text-slate/40 text-sm border-t border-slate/10 mt-8">
                        Powered by Kratisimo
                    </footer>
                </BrowserRouter>
            </BusinessProvider>
        </AuthProvider>
    );
}

export default App;