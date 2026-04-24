import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ title, children }) {
  const { logout } = useAuth();
  const navigate   = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <span className="navbar-title">{title}</span>
      <div className="navbar-right">
        {children}
        <button className="btn btn-sm" onClick={handleLogout}>Выйти</button>
      </div>
    </nav>
  );
}
