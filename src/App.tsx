import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from './useAuth';
import Events from './Events';
import Feed from './Feed';
import Profile from './Profile';
import Friends from './Friends';
import Login from './Login';
import logo from './file.svg';
import './App.css';

type Page = 'home' | 'feed' | 'events' | 'profile' | 'friends' | 'login';

function App() {
  const { currentUser, userProfile, loading, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Set initial page to feed when user logs in
  useEffect(() => {
    if (currentUser) {
      if (currentPage === 'login' || currentPage === 'home') {
        setCurrentPage('feed');
      }
    } else if (!currentUser && currentPage !== 'login') {
      setCurrentPage('home');
    }
  }, [currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogout = async () => {
    try {
      await logout();
      setShowDropdown(false);
    } catch (error) {
      console.error('Logout error:', error);
      alert('Failed to log out. Please try again.');
    }
  };

  const handleProfile = () => {
    setCurrentPage('profile');
    setShowDropdown(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  if (loading) {
    return (
      <div className="App">
        <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="App">
      {/* Header - Hide on login page */}
      {currentPage !== 'login' && (
      <header className="App-top-header">
        <div className="App-header-content">
          <div className="App-header-logo-container">
            <img src={logo} className="App-header-logo" alt="logo" />
            <div className="App-logo-small">FriendRequest</div>
          </div>
          <div className="App-header-right">
            {currentUser ? (
              <div className="App-profile-container" ref={dropdownRef}>
                {currentUser?.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt="Profile"
                    className="App-profile-pic"
                    crossOrigin="anonymous"
                    referrerPolicy="no-referrer"
                    onClick={() => setShowDropdown(!showDropdown)}
                    onError={(e) => {
                      // Fallback to default avatar if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.onerror = null; // Prevent infinite loop
                      console.error('Profile image failed to load:', currentUser.photoURL);
                      const displayName = userProfile?.first_name && userProfile?.last_name 
                        ? `${userProfile.first_name} ${userProfile.last_name}`
                        : (userProfile?.email || currentUser?.email || 'User');
                      target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=4285f4&color=fff&size=40`;
                    }}
                    onLoad={() => {
                      console.log('Profile image loaded successfully:', currentUser.photoURL);
                    }}
                  />
                ) : (
                  <div
                    className="App-profile-pic App-profile-placeholder"
                    onClick={() => setShowDropdown(!showDropdown)}
                  >
                    {(userProfile?.first_name?.[0] || userProfile?.email?.[0] || currentUser?.displayName?.[0] || currentUser?.email?.[0] || 'U').toUpperCase()}
                  </div>
                )}
                {showDropdown && (
                  <div className="App-dropdown">
                    <div className="App-dropdown-item" onClick={handleProfile}>
                      Profile
                    </div>
                    <div className="App-dropdown-item" onClick={handleLogout}>
                      Logout
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                className="App-login-button"
                onClick={() => setCurrentPage('login')}
              >
                Login
              </button>
            )}
          </div>
        </div>
      </header>
      )}

      {/* Navigation - Only show if user is logged in */}
      {currentUser && currentPage !== 'login' && (
        <nav className="App-nav">
          <button 
            className={`App-nav-button ${currentPage === 'home' ? 'active' : ''}`}
            onClick={() => setCurrentPage('home')}
          >
            Home
          </button>
          <button 
            className={`App-nav-button ${currentPage === 'feed' ? 'active' : ''}`}
            onClick={() => setCurrentPage('feed')}
          >
            Feed
          </button>
          <button 
            className={`App-nav-button ${currentPage === 'events' ? 'active' : ''}`}
            onClick={() => setCurrentPage('events')}
          >
            Events
          </button>
          <button 
            className={`App-nav-button ${currentPage === 'friends' ? 'active' : ''}`}
            onClick={() => setCurrentPage('friends')}
          >
            Friends
          </button>
        </nav>
      )}

      {/* Main Content */}
      {currentPage === 'login' ? (
        <Login onBack={() => setCurrentPage('home')} />
      ) : (
        <div className={`App-main ${currentPage === 'home' ? 'home-page' : ''} ${currentPage === 'profile' ? 'profile-page' : ''}`}>
          {currentPage === 'home' ? (
            <>
              <img src={logo} className="App-logo" alt="logo" />
              <p className="App-welcome-text">
                Welcome to FriendRequest by SHaaS
              </p>
              {currentUser ? (
                <p className="App-welcome-subtext">
                  {userProfile ? `Hello, ${userProfile.first_name} ${userProfile.last_name}!` : 'Welcome!'}
                </p>
              ) : (
                <p className="App-welcome-subtext">
                  Please sign in to continue
                </p>
              )}
            </>
          ) : currentPage === 'feed' ? (
            <Feed />
          ) : currentPage === 'events' ? (
            <Events />
          ) : currentPage === 'friends' ? (
            <Friends />
          ) : currentPage === 'profile' ? (
            <Profile />
          ) : null}
        </div>
      )}
    </div>
  );
}

export default App;
