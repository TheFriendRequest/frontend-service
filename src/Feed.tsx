import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import './Feed.css';

interface Post {
  post_id: number;
  title: string;
  body: string | null;
  image_url: string | null;
  created_by: number;
  created_at: string;
  interests?: Array<{ interest_id: number; interest_name: string }>;
}

interface PostFormData {
  title: string;
  body: string;
  image_url: string;
  interest_ids: number[];
}

const Feed: React.FC = () => {
  const { idToken, currentUser, userProfile } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [interests, setInterests] = useState<Array<{ interest_id: number; interest_name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<PostFormData>({
    title: '',
    body: '',
    image_url: '',
    interest_ids: []
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const compositeServiceUrl = process.env.REACT_APP_COMPOSITE_SERVICE_URL || 'http://localhost:8000';

  const fetchPosts = useCallback(async (offset: number = 0) => {
    if (!idToken) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${compositeServiceUrl}/api/posts?skip=${offset}&limit=10`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      // Log eTag from response
      const etag = response.headers.get('ETag') || response.headers.get('etag');
      console.log('📦 Feed Service - Response Headers:', {
        'ETag': etag || '(not found)',
        'All Headers': Array.from(response.headers.entries()),
        'URL': `${compositeServiceUrl}/api/posts?skip=${offset}&limit=10`
      });
      if (etag) {
        console.log('✅ eTag received:', etag);
      } else {
        console.warn('⚠️  eTag not found in response headers');
      }

      if (!response.ok) {
        let errorMessage = 'Failed to fetch posts';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch {
          errorMessage = `Backend error: ${response.status} ${response.statusText}`;
        }
        
        // Log detailed error for debugging
        console.error('Feed fetch error:', {
          status: response.status,
          statusText: response.statusText,
          errorMessage: errorMessage,
          url: `${compositeServiceUrl}/api/posts?skip=${offset}&limit=10`
        });
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      // Composite service returns {items: [...], total, skip, limit, has_more}
      // Direct service returns array or {items: [...]}
      const postsList = Array.isArray(data) ? data : (data.items || []);
      if (offset === 0) {
        setPosts(postsList);
      } else {
        setPosts(prev => [...prev, ...postsList]);
      }
      setHasMore(data.has_more !== undefined ? data.has_more : (postsList.length >= 10));
    } catch (error: any) {
      console.error('Error fetching posts:', error);
      setError(error.message || 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [idToken, compositeServiceUrl]);

  const fetchInterests = useCallback(async () => {
    if (!idToken) return;
    
    try {
      const response = await fetch(`${compositeServiceUrl}/api/posts/interests`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Fetched interests:', data);
        setInterests(Array.isArray(data) ? data : []);
      } else {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        console.error('Error fetching interests:', response.status, errorData);
        setInterests([]); // Set empty array on error so UI doesn't break
      }
    } catch (error) {
      console.error('Error fetching interests:', error);
      setInterests([]); // Set empty array on error so UI doesn't break
    }
  }, [idToken, compositeServiceUrl]);

  useEffect(() => {
    if (idToken) {
      fetchPosts(0);
      fetchInterests();
    }
  }, [idToken, fetchPosts, fetchInterests]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleInterestToggle = (interestId: number) => {
    setFormData(prev => ({
      ...prev,
      interest_ids: prev.interest_ids.includes(interestId)
        ? prev.interest_ids.filter(id => id !== interestId)
        : [...prev.interest_ids, interestId]
    }));
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idToken) {
      setError('You must be logged in to create posts');
      return;
    }

    try {
      setError(null);
      
      const postData = {
        title: formData.title,
        body: formData.body || null,
        image_url: formData.image_url || null,
        interest_ids: formData.interest_ids
      };

      const response = await fetch(`${compositeServiceUrl}/api/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(postData)
      });

      // Log eTag from response (if present)
      const etag = response.headers.get('ETag') || response.headers.get('etag');
      if (etag) {
        console.log('📦 Feed Service - eTag received (POST):', etag);
      }

      if (!response.ok) {
        let errorMessage = 'Failed to create post';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch {
          errorMessage = `Backend error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      setSuccess('Post created successfully!');
      setFormData({
        title: '',
        body: '',
        image_url: '',
        interest_ids: []
      });
      setShowCreateForm(false);
      fetchPosts(0);
    } catch (error: any) {
      console.error('Error creating post:', error);
      setError(error.message || 'Failed to create post');
    }
  };

  const formatDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return date.toLocaleString();
  };

  const loadMore = () => {
    const newSkip = skip + 10;
    setSkip(newSkip);
    fetchPosts(newSkip);
  };

  if (!currentUser) {
    return (
      <div className="feed-container">
        <div className="feed-message">Please log in to view the feed.</div>
      </div>
    );
  }

  return (
    <div className="feed-container">
      <div className="feed-header">
        <h2>Feed</h2>
        <button 
          className="feed-create-button" 
          onClick={() => {
            setShowCreateForm(!showCreateForm);
            setError(null);
            setSuccess(null);
          }}
        >
          {showCreateForm ? 'Cancel' : '+ Create Post'}
        </button>
      </div>

      {error && <div className="feed-error">{error}</div>}
      {success && <div className="feed-success">{success}</div>}

      {showCreateForm && (
        <div className="feed-form-container">
          <h3>Create New Post</h3>
          <form onSubmit={handleCreatePost}>
            <div className="feed-form-group">
              <label htmlFor="title">Title *</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                placeholder="Post title"
              />
            </div>

            <div className="feed-form-group">
              <label htmlFor="body">Content</label>
              <textarea
                id="body"
                name="body"
                value={formData.body}
                onChange={handleInputChange}
                rows={6}
                placeholder="What's on your mind?"
              />
            </div>

            <div className="feed-form-group">
              <label htmlFor="image_url">Image URL</label>
              <input
                type="url"
                id="image_url"
                name="image_url"
                value={formData.image_url}
                onChange={handleInputChange}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="feed-form-group">
              <label>Interests</label>
              <div className="feed-interests-grid">
                {interests.map(interest => (
                  <label key={interest.interest_id} className="feed-interest-checkbox">
                    <input
                      type="checkbox"
                      checked={formData.interest_ids.includes(interest.interest_id)}
                      onChange={() => handleInterestToggle(interest.interest_id)}
                    />
                    <span>{interest.interest_name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="feed-form-actions">
              <button type="submit" className="feed-submit-button">
                Create Post
              </button>
              <button 
                type="button" 
                className="feed-cancel-button"
                onClick={() => {
                  setShowCreateForm(false);
                  setFormData({
                    title: '',
                    body: '',
                    image_url: '',
                    interest_ids: []
                  });
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && posts.length === 0 ? (
        <div className="feed-loading">Loading posts...</div>
      ) : posts.length === 0 ? (
        <div className="feed-message">No posts found. Create your first post!</div>
      ) : (
        <div className="feed-posts">
          {posts.map((post) => (
            <div key={post.post_id} className="feed-post-card">
              <div className="feed-post-header">
                <div className="feed-post-author">
                  <div className="feed-post-avatar">
                    {userProfile?.first_name?.[0] || 'U'}
                  </div>
                  <div>
                    <div className="feed-post-author-name">
                      {userProfile?.first_name} {userProfile?.last_name}
                    </div>
                    <div className="feed-post-time">
                      {formatDateTime(post.created_at)}
                    </div>
                  </div>
                </div>
              </div>
              
              <h3 className="feed-post-title">{post.title}</h3>
              
              {post.body && (
                <p className="feed-post-body">{post.body}</p>
              )}
              
              {post.image_url && (
                <img 
                  src={post.image_url} 
                  alt={post.title}
                  className="feed-post-image"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              )}
              
              {post.interests && post.interests.length > 0 && (
                <div className="feed-post-interests">
                  {post.interests.map(interest => (
                    <span key={interest.interest_id} className="feed-interest-tag">
                      {interest.interest_name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
          
          {hasMore && (
            <button className="feed-load-more" onClick={loadMore}>
              Load More
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Feed;

