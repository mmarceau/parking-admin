import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import AdminPage from "./AdminPage";
import UserPage from "./UserPage";
import { Button } from "./components/ui/button";

function Navigation() {
  const location = useLocation();
  
  return (
    <nav className="bg-white border-b border-gray-200 px-8 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <h1 className="text-xl font-bold text-gray-900">Parking Portal</h1>
          <div className="flex space-x-2">
            <Link to="/admin">
              <Button 
                variant={location.pathname === "/admin" ? "default" : "outline"}
                size="sm"
              >
                Admin Portal
              </Button>
            </Link>
            <Link to="/user">
              <Button 
                variant={location.pathname === "/user" ? "default" : "outline"}
                size="sm"
              >
                User Portal
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <Routes>
          <Route path="/" element={<UserPage />} />
          <Route path="/user" element={<UserPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
