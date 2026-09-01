import { Link } from 'react-router-dom';

export function Navbar() {
  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link to="/" className="flex items-center">
              <span className="text-2xl font-bold text-primary">FinGenius</span>
            </Link>
          </div>
          <div className="flex space-x-8">
            <Link to="/login" className="inline-flex items-center px-4 py-2 text-sm font-medium text-muted-foreground hover:text-primary">
              Login
            </Link>
            <Link to="/signup" className="inline-flex items-center px-4 py-2 text-sm font-medium bg-primary text-white rounded-md hover:bg-primary/90">
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
} 