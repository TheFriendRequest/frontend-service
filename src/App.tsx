import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from './useAuth';
import Events from './Events';
import logo from './file.svg';
import './App.css';

type Page = 'home' | 'events';

function App() {
  const { currentUser, userProfile, loading, signInWithGoogle, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error: any) {
      console.error('Sign in error:', error);
      // Show more specific error message
      const errorMessage = error?.message || 'Failed to sign in. Please try again.';
      alert(errorMessage);
    }
  };

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
    // TODO: Navigate to profile page
    console.log('Navigate to profile');
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
        <div style={{ padding: '20px' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="App">
      {/* Header */}
      <header className="App-top-header">
        <div className="App-header-content">
          <div className="App-logo-small">FriendRequest</div>
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
              <button className="App-login-button" onClick={handleSignIn}>
                <svg width="20" height="20" viewBox="0 0 24 24" style={{ marginRight: '8px' }}>
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Login
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Navigation */}
      {currentUser && (
        <nav className="App-nav">
          <button 
            className={`App-nav-button ${currentPage === 'home' ? 'active' : ''}`}
            onClick={() => setCurrentPage('home')}
          >
            Home
          </button>
          <button 
            className={`App-nav-button ${currentPage === 'events' ? 'active' : ''}`}
            onClick={() => setCurrentPage('events')}
          >
            Events
          </button>
        </nav>
      )}

      {/* Main Content */}
      <div className={`App-main ${currentPage === 'home' ? 'home-page' : ''}`}>
        {currentPage === 'home' ? (
          <>
            <img src={logo} className="App-logo" alt="logo" />
            <p className="App-welcome-text">
              Welcome to FriendRequest by SHaaS
            </p>
            {currentUser && (
              <p className="App-welcome-subtext">
                {userProfile ? `Hello, ${userProfile.first_name} ${userProfile.last_name}!` : 'Welcome!'}
              </p>
            )}
          </>
        ) : (
          <Events />
        )}
      </div>
    </div>
  );
}

export default App;
