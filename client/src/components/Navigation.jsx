import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navigation = () => {
  const { user } = useAuth();

  return (
    <nav className="bg-flatSecondary border-b-2 border-slate-200 px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="text-2xl sm:text-3xl font-black text-cricketGreen tracking-tight">
        CricketTracker
      </div>
      <div className="flex flex-wrap justify-center gap-2 sm:gap-4">
        <NavLink 
          to="/" 
          className={({ isActive }) => 
            `px-4 sm:px-6 py-2 sm:py-3 rounded-xl text-base sm:text-lg font-bold transition-colors ${
              isActive ? 'bg-cricketGreen text-white' : 'text-slate-700 hover:bg-white hover:text-cricketGreen'
            }`
          }
        >
          Public View
        </NavLink>

        {!user ? (
          <NavLink 
            to="/login" 
            className={({ isActive }) => 
              `px-4 sm:px-6 py-2 sm:py-3 rounded-xl text-base sm:text-lg font-bold transition-colors ${
                isActive ? 'bg-cricketGreen text-white' : 'text-slate-700 hover:bg-white hover:text-cricketGreen'
              }`
            }
          >
            Admin Login
          </NavLink>
        ) : (
          <NavLink 
            to="/admin" 
            className={({ isActive }) => 
              `px-4 sm:px-6 py-2 sm:py-3 rounded-xl text-base sm:text-lg font-bold transition-colors ${
                isActive ? 'bg-cricketGreen text-white' : 'text-slate-700 hover:bg-white hover:text-cricketGreen'
              }`
            }
          >
            Dashboard
          </NavLink>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
