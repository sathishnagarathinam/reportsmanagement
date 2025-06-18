import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaHome, FaFolder, FaEnvelope, FaBell, FaMapMarkerAlt, FaChartBar, FaSignOutAlt, FaArrowLeft, FaUsersCog } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  userData: any;
}

const Sidebar: React.FC<SidebarProps> = ({ userData }) => {
  const { currentUser, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="sidebar">
      <div className="profile-section">
        <img 
          src="/Indiapost_Logo.png" 
          alt="Company Logo" 
          className="company-logo"
        />
        <div className="avatar">
          <img src="/default-avatar.png" alt="User Avatar" />
        </div>
        <h2>{userData?.name || 'Loading...'}</h2>
        <p>{userData?.email || currentUser?.email || 'Loading...'}</p>
      </div>
      
      <nav className="nav-menu">
        {location.pathname !== '/' && (
          <a href="#" className="nav-item back" onClick={() => handleNavigation('/')}>
            <FaArrowLeft /> <span>back to dashboard</span>
          </a>
        )}
        <a href="#" className={`nav-item ${isActive('/') ? 'active' : ''}`} onClick={() => handleNavigation('/')}>
          <FaHome /> <span>home</span>
        </a>
        <a href="#" className={`nav-item ${isActive('/data-entry') ? 'active' : ''}`} onClick={() => handleNavigation('/data-entry')}>
          <FaFolder /> <span>data entry</span>
        </a>
        <a href="#" className={`nav-item ${isActive('/reports') ? 'active' : ''}`} onClick={() => handleNavigation('/reports')}>
          <FaEnvelope /> <span>reports</span>
        </a>
        {userData?.role === 'master_admin' && (
          <a href="#" className={`nav-item ${isActive('/master-admin') ? 'active' : ''}`} onClick={() => handleNavigation('/master-admin')}>
            <FaUsersCog /> <span>master admin</span>
          </a>
        )}
        {userData?.role === 'admin' && (
          <a href="#" className={`nav-item ${isActive('/admin') ? 'active' : ''}`} onClick={() => handleNavigation('/admin')}>
            <FaUsersCog /> <span>admin</span>
          </a>
        )}
        <a href="#" className="nav-item">
          <FaBell /> <span>notification</span>
        </a>
        <a href="#" className="nav-item">
          <FaMapMarkerAlt /> <span>location</span>
        </a>
        <a href="#" className="nav-item">
          <FaChartBar /> <span>graph</span>
        </a>
        <a href="#" className="nav-item logout" onClick={handleLogout}>
          <FaSignOutAlt /> <span>logout</span>
        </a>
      </nav>
    </div>
  );
};

export default Sidebar;