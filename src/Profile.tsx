import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import './Profile.css';

interface Schedule {
  schedule_id: number;
  user_id: number;
  start_time: string;
  end_time: string;
  type: 'class' | 'event' | 'personal';
  title: string;
}

interface Interest {
  interest_id: number;
  interest_name: string;
}

const Profile: React.FC = () => {
  const { idToken, currentUser, userProfile, syncUserToBackend } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [allInterests, setAllInterests] = useState<Interest[]>([]);
  const [userInterests, setUserInterests] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    profile_picture: ''
  });

  const [scheduleForm, setScheduleForm] = useState({
    title: '',
    start_time: '',
    end_time: '',
    type: 'personal' as 'class' | 'event' | 'personal'
  });
  const [showScheduleForm, setShowScheduleForm] = useState(false);

  const compositeServiceUrl = process.env.REACT_APP_COMPOSITE_SERVICE_URL || 'http://localhost:8000';

  const fetchProfile = useCallback(async () => {
    if (!idToken) {
      setLoading(false);
      return;
    }
    
    // If userProfile exists, populate form data
    if (userProfile) {
      try {
        setLoading(true);
        setProfileData({
          first_name: userProfile.first_name || '',
          last_name: userProfile.last_name || '',
          username: userProfile.username || '',
          email: userProfile.email || '',
          profile_picture: userProfile.profile_picture || ''
        });
      } catch (error) {
        console.error('Error setting profile data:', error);
      } finally {
        setLoading(false);
      }
    } else {
      // If no userProfile, we're still loading
      setLoading(true);
    }
  }, [idToken, userProfile]);

  const fetchSchedules = useCallback(async () => {
    if (!idToken || !userProfile?.user_id) return;
    
    try {
      const response = await fetch(`${compositeServiceUrl}/api/users/${userProfile.user_id}/schedules`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      // Log eTag from response (if present)
      const etag = response.headers.get('ETag') || response.headers.get('etag');
      if (etag) {
        console.log('👤 Profile Service - eTag received (GET schedules):', etag);
      }

      if (response.ok) {
        const data = await response.json();
        setSchedules(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
    }
  }, [idToken, userProfile, compositeServiceUrl]);

  const fetchInterests = useCallback(async () => {
    if (!idToken || !userProfile?.user_id) return;
    
    try {
      // Fetch all available interests
      const allResponse = await fetch(`${compositeServiceUrl}/api/users/interests`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      if (allResponse.ok) {
        const allData = await allResponse.json();
        setAllInterests(Array.isArray(allData) ? allData : []);
      }

      // Fetch user's interests
      const userResponse = await fetch(`${compositeServiceUrl}/api/users/${userProfile.user_id}/interests`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      if (userResponse.ok) {
        const userData = await userResponse.json();
        const interestIds = Array.isArray(userData) ? userData.map((i: Interest) => i.interest_id) : [];
        setUserInterests(interestIds);
      }
    } catch (error) {
      console.error('Error fetching interests:', error);
    }
  }, [idToken, userProfile, compositeServiceUrl]);

  useEffect(() => {
    if (idToken && userProfile) {
      fetchProfile();
      fetchSchedules();
      fetchInterests();
    }
  }, [idToken, userProfile, fetchProfile, fetchSchedules, fetchInterests]);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idToken || !userProfile) return;

    try {
      setSaving(true);
      setError(null);
      
      const response = await fetch(`${compositeServiceUrl}/api/users/${userProfile.user_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(profileData)
      });

      // Log eTag from response (if present)
      const etag = response.headers.get('ETag') || response.headers.get('etag');
      if (etag) {
        console.log('👤 Profile Service - eTag received (PUT):', etag);
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update profile');
      }

      setSuccess('Profile updated successfully!');
      // Refresh user profile
      window.location.reload();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setError(error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleScheduleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setScheduleForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idToken || !userProfile) return;

    try {
      setError(null);
      
      const scheduleData = {
        title: scheduleForm.title,
        start_time: new Date(scheduleForm.start_time).toISOString(),
        end_time: new Date(scheduleForm.end_time).toISOString(),
        type: scheduleForm.type
      };

      const response = await fetch(`${compositeServiceUrl}/api/users/${userProfile.user_id}/schedules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(scheduleData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to add schedule');
      }

      setSuccess('Schedule added successfully!');
      setScheduleForm({
        title: '',
        start_time: '',
        end_time: '',
        type: 'personal'
      });
      setShowScheduleForm(false);
      fetchSchedules();
    } catch (error: any) {
      console.error('Error adding schedule:', error);
      setError(error.message || 'Failed to add schedule');
    }
  };

  const handleDeleteSchedule = async (scheduleId: number) => {
    if (!idToken || !userProfile) return;
    if (!window.confirm('Are you sure you want to delete this schedule?')) return;

    try {
      const response = await fetch(`${compositeServiceUrl}/api/users/${userProfile.user_id}/schedules/${scheduleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete schedule');
      }

      setSuccess('Schedule deleted successfully!');
      fetchSchedules();
    } catch (error: any) {
      console.error('Error deleting schedule:', error);
      setError(error.message || 'Failed to delete schedule');
    }
  };

  const handleInterestToggle = (interestId: number) => {
    setUserInterests(prev =>
      prev.includes(interestId)
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId]
    );
  };

  const handleSaveInterests = async () => {
    if (!idToken || !userProfile) return;

    try {
      setSaving(true);
      setError(null);
      
      const response = await fetch(`${compositeServiceUrl}/api/users/${userProfile.user_id}/interests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(userInterests)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update interests');
      }

      setSuccess('Interests updated successfully!');
    } catch (error: any) {
      console.error('Error updating interests:', error);
      setError(error.message || 'Failed to update interests');
    } finally {
      setSaving(false);
    }
  };

  const formatDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return date.toLocaleString();
  };

  if (!currentUser) {
    return (
      <div className="profile-container">
        <div className="profile-message">Please log in to view your profile.</div>
      </div>
    );
  }

  // Show loading only if we're actively loading and don't have userProfile yet
  if (loading && !userProfile && idToken) {
    return (
      <div className="profile-container">
        <div className="profile-message">Loading profile...</div>
      </div>
    );
  }

  // If we have a token but no profile after loading, show error
  if (!loading && !userProfile && idToken) {
    return (
      <div className="profile-container">
        <div className="profile-error">
          Failed to load profile. Please try refreshing the page or contact support.
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <h2>Profile</h2>

      {error && <div className="profile-error">{error}</div>}
      {success && <div className="profile-success">{success}</div>}

      {/* Profile Information */}
      <div className="profile-section">
        <h3>Personal Information</h3>
        <form onSubmit={handleSaveProfile}>
          <div className="profile-form-row">
            <div className="profile-form-group">
              <label htmlFor="first_name">First Name</label>
              <input
                type="text"
                id="first_name"
                name="first_name"
                value={profileData.first_name}
                onChange={handleProfileChange}
                required
              />
            </div>
            <div className="profile-form-group">
              <label htmlFor="last_name">Last Name</label>
              <input
                type="text"
                id="last_name"
                name="last_name"
                value={profileData.last_name}
                onChange={handleProfileChange}
                required
              />
            </div>
          </div>
          <div className="profile-form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={profileData.username}
              onChange={handleProfileChange}
              required
            />
          </div>
          <div className="profile-form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={profileData.email}
              onChange={handleProfileChange}
              required
            />
          </div>
          <div className="profile-form-group">
            <label htmlFor="profile_picture">Profile Picture URL</label>
            <input
              type="url"
              id="profile_picture"
              name="profile_picture"
              value={profileData.profile_picture}
              onChange={handleProfileChange}
              placeholder="https://example.com/image.jpg"
            />
          </div>
          <button type="submit" className="profile-save-button" disabled={saving}>
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>

      {/* Schedules */}
      <div className="profile-section">
        <div className="profile-section-header">
          <h3>Schedules</h3>
          <button
            className="profile-add-button"
            onClick={() => setShowScheduleForm(!showScheduleForm)}
          >
            {showScheduleForm ? 'Cancel' : '+ Add Schedule'}
          </button>
        </div>

        {showScheduleForm && (
          <form onSubmit={handleAddSchedule} className="schedule-form">
            <div className="profile-form-group">
              <label htmlFor="schedule_title">Title</label>
              <input
                type="text"
                id="schedule_title"
                name="title"
                value={scheduleForm.title}
                onChange={handleScheduleChange}
                required
                placeholder="e.g., COMS 4705 Lecture"
              />
            </div>
            <div className="profile-form-row">
              <div className="profile-form-group">
                <label htmlFor="schedule_start">Start Time</label>
                <input
                  type="datetime-local"
                  id="schedule_start"
                  name="start_time"
                  value={scheduleForm.start_time}
                  onChange={handleScheduleChange}
                  required
                />
              </div>
              <div className="profile-form-group">
                <label htmlFor="schedule_end">End Time</label>
                <input
                  type="datetime-local"
                  id="schedule_end"
                  name="end_time"
                  value={scheduleForm.end_time}
                  onChange={handleScheduleChange}
                  required
                />
              </div>
            </div>
            <div className="profile-form-group">
              <label htmlFor="schedule_type">Type</label>
              <select
                id="schedule_type"
                name="type"
                value={scheduleForm.type}
                onChange={handleScheduleChange}
                required
              >
                <option value="class">Class</option>
                <option value="event">Event</option>
                <option value="personal">Personal</option>
              </select>
            </div>
            <button type="submit" className="profile-save-button">
              Add Schedule
            </button>
          </form>
        )}

        <div className="schedules-list">
          {schedules.length === 0 ? (
            <div className="profile-empty">No schedules added yet.</div>
          ) : (
            schedules.map(schedule => (
              <div key={schedule.schedule_id} className="schedule-item">
                <div className="schedule-info">
                  <strong>{schedule.title}</strong>
                  <div className="schedule-details">
                    {formatDateTime(schedule.start_time)} - {formatDateTime(schedule.end_time)}
                  </div>
                  <span className={`schedule-type schedule-type-${schedule.type}`}>
                    {schedule.type}
                  </span>
                </div>
                <button
                  className="schedule-delete-button"
                  onClick={() => handleDeleteSchedule(schedule.schedule_id)}
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Interests */}
      <div className="profile-section">
        <div className="profile-section-header">
          <h3>Interests</h3>
          <button
            className="profile-save-button"
            onClick={handleSaveInterests}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Interests'}
          </button>
        </div>
        <div className="interests-grid">
          {allInterests.map(interest => (
            <label key={interest.interest_id} className="interest-checkbox">
              <input
                type="checkbox"
                checked={userInterests.includes(interest.interest_id)}
                onChange={() => handleInterestToggle(interest.interest_id)}
              />
              <span>{interest.interest_name}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Profile;

