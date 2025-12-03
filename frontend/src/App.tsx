import { Route, Switch, useLocation } from "wouter";

import { Header } from "./components/Header";
import ErrorBoundary from "./components/ErrorBoundary";
import { ProtectedRoute } from "./components/ProtectedRoute";

import Landing from "./pages/Landing";
import Profile from "./pages/Profile";
import MoviePage from "./pages/MoviePage";
import AdminPanel from "./pages/AdminPanel";
import MyMovies from "./pages/MyMovies";
import Films from "./pages/Films";
import ResetPassword from "./pages/ResetPassword";
import PurchaseCheckout from "./pages/PurchaseCheckout";
import NotFound from "./pages/NotFound";

export default function App() {
  const [location] = useLocation();

  if (location === "/reset-password" || location === "/auth/reset-password") {
    return (
      <ErrorBoundary>
        <ResetPassword />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-cinema-gradient">
        <Header />
        <main className="pt-14">
          <Switch>
            <Route path="/" component={Landing} />
            <Route path="/profile">
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            </Route>
            <Route path="/movie/:id" component={MoviePage} />
            <Route path="/films" component={Films} />
            <Route path="/admin">
              <ProtectedRoute allowedRoles={["admin", "administrator", "moderator"]}>
                <AdminPanel />
              </ProtectedRoute>
            </Route>
            <Route path="/purchase/:movieId">
              {(params) => (
                <ProtectedRoute>
                  <PurchaseCheckout params={params} />
                </ProtectedRoute>
              )}
            </Route>
            <Route path="/my-movies">
              <ProtectedRoute>
                <MyMovies />
              </ProtectedRoute>
            </Route>
            <Route path="/:rest*">
              <NotFound />
            </Route>
          </Switch>
        </main>
      </div>
    </ErrorBoundary>
  );
}
