import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import './Friends.css';

interface User {
  user_id: number;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  profile_picture?: string;
  friendship_status?: 'pending' | 'accepted' | null;
}

interface FriendRequest {
  friendship_id: number;
  user_id_1: number;
  user_id_2: number;
  status: string;
  created_at: string;
  sender_user_id: number;
  sender_first_name: string;
  sender_last_name: string;
  sender_username: string;
  sender_profile_picture?: string;
  from_user_id?: number;
  sender_id?: number;
}

interface SentRequest {
  friendship_id: number;
  user_id_1: number;
  user_id_2: number;
  status: string;
  created_at: string;
  recipient_user_id: number;
  recipient_id: number;
  recipient_first_name: string;
  recipient_last_name: string;
  recipient_username: string;
  recipient_profile_picture?: string;
}

interface Friend {
  friendship_id: number;
  user_id_1: number;
  user_id_2: number;
  status: string;
  created_at: string;
  friend_user_id: number;
  friend_id: number;
  friend_first_name: string;
  friend_last_name: string;
  friend_username: string;
  friend_profile_picture?: string;
}

const Friends: React.FC = () => {
  const { idToken, currentUser, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'search' | 'pending' | 'friends'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<SentRequest[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const compositeServiceUrl = process.env.REACT_APP_COMPOSITE_SERVICE_URL || 'http://localhost:8000';

  // Fetch incoming pending requests (requests sent TO me)
  const fetchPendingRequests = useCallback(async () => {
    if (!idToken) return;

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${compositeServiceUrl}/api/friends/requests/pending`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to fetch pending requests' }));
        throw new Error(errorData.detail || `Error: ${response.status}`);
      }

      const data = await response.json();
      setPendingRequests(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Error fetching pending requests:', err);
      setError(err.message || 'Failed to fetch pending requests');
    } finally {
      setLoading(false);
    }
  }, [idToken, compositeServiceUrl]);

  // Fetch sent requests (requests I sent)
  const fetchSentRequests = useCallback(async () => {
    if (!idToken) return;

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${compositeServiceUrl}/api/friends/requests/sent`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to fetch sent requests' }));
        throw new Error(errorData.detail || `Error: ${response.status}`);
      }

      const data = await response.json();
      setSentRequests(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Error fetching sent requests:', err);
      setError(err.message || 'Failed to fetch sent requests');
    } finally {
      setLoading(false);
    }
  }, [idToken, compositeServiceUrl]);

  // Fetch friends list
  const fetchFriends = useCallback(async () => {
    if (!idToken) return;

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${compositeServiceUrl}/api/friends`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to fetch friends' }));
        throw new Error(errorData.detail || `Error: ${response.status}`);
      }

      const data = await response.json();
      setFriends(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Error fetching friends:', err);
      setError(err.message || 'Failed to fetch friends');
    } finally {
      setLoading(false);
    }
  }, [idToken, compositeServiceUrl]);

  // Search users
  const searchUsers = useCallback(async (query: string) => {
    if (!idToken || !query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${compositeServiceUrl}/api/users/search?q=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to search users' }));
        throw new Error(errorData.detail || `Error: ${response.status}`);
      }

      const data = await response.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Error searching users:', err);
      setError(err.message || 'Failed to search users');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, [idToken, compositeServiceUrl]);

  // Send friend request
  const handleSendRequest = async (toUserId: number) => {
    if (!idToken) return;

    try {
      setError(null);
      setSuccess(null);
      const response = await fetch(`${compositeServiceUrl}/api/friends/requests?to_user_id=${toUserId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to send friend request' }));
        throw new Error(errorData.detail || `Error: ${response.status}`);
      }

      setSuccess('Friend request sent!');
      // Update search results to show pending status
      setSearchResults(prev => prev.map(user => 
        user.user_id === toUserId ? { ...user, friendship_status: 'pending' } : user
      ));
      // Refresh pending requests
      if (activeTab === 'pending') {
        fetchPendingRequests();
      }
    } catch (err: any) {
      console.error('Error sending friend request:', err);
      setError(err.message || 'Failed to send friend request');
    }
  };

  // Accept friend request
  const handleAcceptRequest = async (friendshipId: number) => {
    if (!idToken) return;

    try {
      setError(null);
      setSuccess(null);
      const response = await fetch(`${compositeServiceUrl}/api/friends/requests/${friendshipId}/accept`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to accept friend request' }));
        throw new Error(errorData.detail || `Error: ${response.status}`);
      }

      setSuccess('Friend request accepted!');
      // Remove from pending and refresh friends list
      setPendingRequests(prev => prev.filter(req => req.friendship_id !== friendshipId));
      fetchFriends();
    } catch (err: any) {
      console.error('Error accepting friend request:', err);
      setError(err.message || 'Failed to accept friend request');
    }
  };

  // Reject friend request (incoming request)
  const handleRejectRequest = async (friendshipId: number) => {
    if (!idToken) return;

    try {
      setError(null);
      setSuccess(null);
      const response = await fetch(`${compositeServiceUrl}/api/friends/requests/${friendshipId}/reject`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to reject friend request' }));
        throw new Error(errorData.detail || `Error: ${response.status}`);
      }

      setSuccess('Friend request rejected');
      // Remove from pending
      setPendingRequests(prev => prev.filter(req => req.friendship_id !== friendshipId));
    } catch (err: any) {
      console.error('Error rejecting friend request:', err);
      setError(err.message || 'Failed to reject friend request');
    }
  };

  // Cancel sent friend request
  const handleCancelRequest = async (friendshipId: number) => {
    if (!idToken) return;

    try {
      setError(null);
      setSuccess(null);
      const response = await fetch(`${compositeServiceUrl}/api/friends/requests/${friendshipId}/reject`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to cancel friend request' }));
        throw new Error(errorData.detail || `Error: ${response.status}`);
      }

      setSuccess('Friend request cancelled');
      // Remove from sent requests
      setSentRequests(prev => prev.filter(req => req.friendship_id !== friendshipId));
    } catch (err: any) {
      console.error('Error cancelling friend request:', err);
      setError(err.message || 'Failed to cancel friend request');
    }
  };

  // Remove friend
  const handleRemoveFriend = async (friendshipId: number) => {
    if (!idToken) return;

    if (!window.confirm('Are you sure you want to remove this friend?')) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      const response = await fetch(`${compositeServiceUrl}/api/friends/${friendshipId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to remove friend' }));
        throw new Error(errorData.detail || `Error: ${response.status}`);
      }

      setSuccess('Friend removed');
      // Remove from friends list
      setFriends(prev => prev.filter(friend => friend.friendship_id !== friendshipId));
    } catch (err: any) {
      console.error('Error removing friend:', err);
      setError(err.message || 'Failed to remove friend');
    }
  };

  // Load data when tab changes
  useEffect(() => {
    if (activeTab === 'pending') {
      fetchPendingRequests();
      fetchSentRequests();
    } else if (activeTab === 'friends') {
      fetchFriends();
    }
  }, [activeTab, fetchPendingRequests, fetchSentRequests, fetchFriends]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'search' && searchQuery.trim()) {
        searchUsers(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, activeTab, searchUsers]);

  const getDisplayName = (user: User | FriendRequest | Friend | SentRequest) => {
    if ('first_name' in user && 'last_name' in user) {
      return `${user.first_name} ${user.last_name}`;
    }
    if ('sender_first_name' in user) {
      return `${user.sender_first_name} ${user.sender_last_name}`;
    }
    if ('friend_first_name' in user) {
      return `${user.friend_first_name} ${user.friend_last_name}`;
    }
    if ('recipient_first_name' in user) {
      return `${user.recipient_first_name} ${user.recipient_last_name}`;
    }
    return 'Unknown User';
  };

  const getProfilePicture = (user: User | FriendRequest | Friend | SentRequest) => {
    if ('profile_picture' in user && user.profile_picture) {
      return user.profile_picture;
    }
    if ('sender_profile_picture' in user && user.sender_profile_picture) {
      return user.sender_profile_picture;
    }
    if ('friend_profile_picture' in user && user.friend_profile_picture) {
      return user.friend_profile_picture;
    }
    if ('recipient_profile_picture' in user && user.recipient_profile_picture) {
      return user.recipient_profile_picture;
    }
    const displayName = getDisplayName(user);
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=4285f4&color=fff&size=60`;
  };

  return (
    <div className="friends-container">
      <div className="friends-header">
        <h2>Friends</h2>
      </div>

      {/* Tabs */}
      <div className="friends-tabs">
        <button
          className={`friends-tab ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          Search
        </button>
        <button
          className={`friends-tab ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending Requests {(pendingRequests.length > 0 || sentRequests.length > 0) && `(${pendingRequests.length + sentRequests.length})`}
        </button>
        <button
          className={`friends-tab ${activeTab === 'friends' ? 'active' : ''}`}
          onClick={() => setActiveTab('friends')}
        >
          My Friends {friends.length > 0 && `(${friends.length})`}
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="friends-message friends-error">
          {error}
          <button onClick={() => setError(null)} className="friends-close-btn">×</button>
        </div>
      )}
      {success && (
        <div className="friends-message friends-success">
          {success}
          <button onClick={() => setSuccess(null)} className="friends-close-btn">×</button>
        </div>
      )}

      {/* Search Tab */}
      {activeTab === 'search' && (
        <div className="friends-search-tab">
          <div className="friends-search-container">
            <input
              type="text"
              className="friends-search-input"
              placeholder="Search by name or username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {loading && <div className="friends-loading">Searching...</div>}

          {!loading && searchQuery.trim() && searchResults.length === 0 && (
            <div className="friends-empty">No users found matching "{searchQuery}"</div>
          )}

          {!loading && searchResults.length > 0 && (
            <div className="friends-results">
              {searchResults.map((user) => (
                <div key={user.user_id} className="friends-user-card">
                  <img
                    src={getProfilePicture(user)}
                    alt={getDisplayName(user)}
                    className="friends-user-avatar"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(getDisplayName(user))}&background=4285f4&color=fff&size=60`;
                    }}
                  />
                  <div className="friends-user-info">
                    <div className="friends-user-name">{getDisplayName(user)}</div>
                    <div className="friends-user-username">@{user.username}</div>
                  </div>
                  <div className="friends-user-actions">
                    {user.friendship_status === 'accepted' && (
                      <span className="friends-status-badge friends-status-accepted">Friends</span>
                    )}
                    {user.friendship_status === 'pending' && (
                      <span className="friends-status-badge friends-status-pending">Pending</span>
                    )}
                    {!user.friendship_status && (
                      <button
                        className="friends-action-btn friends-send-btn"
                        onClick={() => handleSendRequest(user.user_id)}
                        disabled={loading}
                      >
                        Send Request
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!searchQuery.trim() && (
            <div className="friends-empty">
              Enter a name or username to search for friends
            </div>
          )}
        </div>
      )}

      {/* Pending Requests Tab */}
      {activeTab === 'pending' && (
        <div className="friends-pending-tab">
          {loading && <div className="friends-loading">Loading requests...</div>}

          {/* Received Requests Section */}
          <div className="friends-requests-section">
            <h3 className="friends-section-title">Received Requests {pendingRequests.length > 0 && `(${pendingRequests.length})`}</h3>
            
            {!loading && pendingRequests.length === 0 && (
              <div className="friends-empty">No incoming friend requests</div>
            )}

            {!loading && pendingRequests.length > 0 && (
              <div className="friends-requests-list">
                {pendingRequests.map((request) => (
                  <div key={request.friendship_id} className="friends-request-card">
                    <img
                      src={getProfilePicture(request)}
                      alt={getDisplayName(request)}
                      className="friends-user-avatar"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(getDisplayName(request))}&background=4285f4&color=fff&size=60`;
                      }}
                    />
                    <div className="friends-user-info">
                      <div className="friends-user-name">{getDisplayName(request)}</div>
                      <div className="friends-user-username">@{request.sender_username}</div>
                      <div className="friends-request-date">
                        {new Date(request.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="friends-request-actions">
                      <button
                        className="friends-action-btn friends-accept-btn"
                        onClick={() => handleAcceptRequest(request.friendship_id)}
                        disabled={loading}
                      >
                        Accept
                      </button>
                      <button
                        className="friends-action-btn friends-reject-btn"
                        onClick={() => handleRejectRequest(request.friendship_id)}
                        disabled={loading}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sent Requests Section */}
          <div className="friends-requests-section">
            <h3 className="friends-section-title">Sent Requests {sentRequests.length > 0 && `(${sentRequests.length})`}</h3>
            
            {!loading && sentRequests.length === 0 && (
              <div className="friends-empty">No outgoing friend requests</div>
            )}

            {!loading && sentRequests.length > 0 && (
              <div className="friends-requests-list">
                {sentRequests.map((request) => (
                  <div key={request.friendship_id} className="friends-request-card">
                    <img
                      src={request.recipient_profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(`${request.recipient_first_name} ${request.recipient_last_name}`)}&background=4285f4&color=fff&size=60`}
                      alt={`${request.recipient_first_name} ${request.recipient_last_name}`}
                      className="friends-user-avatar"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(`${request.recipient_first_name} ${request.recipient_last_name}`)}&background=4285f4&color=fff&size=60`;
                      }}
                    />
                    <div className="friends-user-info">
                      <div className="friends-user-name">{request.recipient_first_name} {request.recipient_last_name}</div>
                      <div className="friends-user-username">@{request.recipient_username}</div>
                      <div className="friends-request-date">
                        Sent {new Date(request.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="friends-request-actions">
                      <button
                        className="friends-action-btn friends-cancel-btn"
                        onClick={() => handleCancelRequest(request.friendship_id)}
                        disabled={loading}
                      >
                        Cancel Request
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Friends Tab */}
      {activeTab === 'friends' && (
        <div className="friends-list-tab">
          {loading && <div className="friends-loading">Loading friends...</div>}

          {!loading && friends.length === 0 && (
            <div className="friends-empty">You don't have any friends yet. Search for users to send friend requests!</div>
          )}

          {!loading && friends.length > 0 && (
            <div className="friends-list">
              {friends.map((friend) => (
                <div key={friend.friendship_id} className="friends-friend-card">
                  <img
                    src={getProfilePicture(friend)}
                    alt={getDisplayName(friend)}
                    className="friends-user-avatar"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(getDisplayName(friend))}&background=4285f4&color=fff&size=60`;
                    }}
                  />
                  <div className="friends-user-info">
                    <div className="friends-user-name">{getDisplayName(friend)}</div>
                    <div className="friends-user-username">@{friend.friend_username}</div>
                    <div className="friends-friend-date">
                      Friends since {new Date(friend.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="friends-friend-actions">
                    <button
                      className="friends-action-btn friends-remove-btn"
                      onClick={() => handleRemoveFriend(friend.friendship_id)}
                      disabled={loading}
                    >
                      Remove Friend
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Friends;

