import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import './Events.css';

interface Event {
  event_id: number;
  title: string;
  description: string | null;
  location: string | null;
  start_time: string;
  end_time: string;
  capacity: number | null;
  created_by: number;
  created_at: string;
  interests?: Array<{ interest_id: number; interest_name: string }>;
  canRegister?: boolean;
  conflictReason?: string;
}

interface EventFormData {
  title: string;
  description: string;
  location: string;
  start_time: string;
  end_time: string;
  capacity: string;
}

interface Schedule {
  schedule_id: number;
  user_id: number;
  start_time: string;
  end_time: string;
  type: 'class' | 'event' | 'personal';
  title: string;
}

const Events: React.FC = () => {
  const { idToken, currentUser, userProfile } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    location: '',
    start_time: '',
    end_time: '',
    capacity: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const compositeServiceUrl = process.env.REACT_APP_COMPOSITE_SERVICE_URL || 'http://localhost:8000';

  const fetchSchedules = useCallback(async () => {
    if (!idToken || !userProfile?.user_id) return;
    
    try {
      const response = await fetch(`${compositeServiceUrl}/api/users/${userProfile.user_id}/schedules`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSchedules(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
    }
  }, [idToken, userProfile, compositeServiceUrl]);

  const checkEventConflict = (event: Event): { canRegister: boolean; reason?: string } => {
    const eventStart = new Date(event.start_time);
    const eventEnd = new Date(event.end_time);

    for (const schedule of schedules) {
      const scheduleStart = new Date(schedule.start_time);
      const scheduleEnd = new Date(schedule.end_time);

      // Check if event overlaps with schedule
      if (
        (eventStart >= scheduleStart && eventStart < scheduleEnd) ||
        (eventEnd > scheduleStart && eventEnd <= scheduleEnd) ||
        (eventStart <= scheduleStart && eventEnd >= scheduleEnd)
      ) {
        return {
          canRegister: false,
          reason: `Conflicts with ${schedule.title} (${schedule.type})`
        };
      }
    }

    return { canRegister: true };
  };

  const fetchEvents = useCallback(async () => {
    if (!idToken) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${compositeServiceUrl}/api/events`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      console.log('POST request to Events Service', JSON.stringify(response.headers));

      // Log eTag from response
      const etag = response.headers.get('ETag') || response.headers.get('etag');
      console.log('📅 Events Service - Response Headers:', {
        'ETag': etag || '(not found)',
        'All Headers': Array.from(response.headers.entries()),
        'URL': `${compositeServiceUrl}/api/events`
      });
      if (etag) {
        console.log('✅ eTag received:', etag);
      } else {
        console.warn('⚠️  eTag not found in response headers');
      }

      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }

      const data = await response.json();
      // Composite service returns {items: [...], total, skip, limit, has_more}
      // Direct service returns array or {items: [...]}
      const eventsList = Array.isArray(data) ? data : (data.items || []);
      
      // Check conflicts for each event
      const eventsWithConflicts = eventsList.map((event: Event) => {
        const conflictCheck = checkEventConflict(event);
        return {
          ...event,
          canRegister: conflictCheck.canRegister,
          conflictReason: conflictCheck.reason
        };
      });
      
      setEvents(eventsWithConflicts);
    } catch (error: any) {
      console.error('Error fetching events:', error);
      setError(error.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [idToken, compositeServiceUrl, schedules]);

  useEffect(() => {
    if (idToken && userProfile) {
      fetchSchedules();
    }
  }, [idToken, userProfile, fetchSchedules]);

  useEffect(() => {
    if (idToken && schedules.length >= 0) {
      fetchEvents();
    }
  }, [idToken, schedules, fetchEvents]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      location: '',
      start_time: '',
      end_time: '',
      capacity: ''
    });
    setEditingEvent(null);
    setShowCreateForm(false);
    setError(null);
    setSuccess(null);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idToken) {
      setError('You must be logged in to create events');
      return;
    }

    try {
      setError(null);
      const startTimeISO = formData.start_time ? new Date(formData.start_time).toISOString() : '';
      const endTimeISO = formData.end_time ? new Date(formData.end_time).toISOString() : '';
      
      const eventData = {
        title: formData.title,
        description: formData.description || null,
        location: formData.location || null,
        start_time: startTimeISO,
        end_time: endTimeISO,
        capacity: formData.capacity ? parseInt(formData.capacity) : null
      };

      const response = await fetch(`${compositeServiceUrl}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(eventData)
      });

      // Log eTag from response (if present)
      console.log('POST request to Events Service', response);
      const etag = response.headers.get('ETag') || response.headers.get('etag');
      if (etag) {
        console.log('📅 Events Service - eTag received (POST):', etag);
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create event');
      }

      setSuccess('Event created successfully!');
      resetForm();
      fetchEvents();
    } catch (error: any) {
      console.error('Error creating event:', error);
      setError(error.message || 'Failed to create event');
    }
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idToken || !editingEvent) {
      setError('You must be logged in to update events');
      return;
    }

    try {
      setError(null);
      const updateData: any = {};
      if (formData.title) updateData.title = formData.title;
      if (formData.description !== undefined) updateData.description = formData.description || null;
      if (formData.location !== undefined) updateData.location = formData.location || null;
      if (formData.start_time) {
        updateData.start_time = new Date(formData.start_time).toISOString();
      }
      if (formData.end_time) {
        updateData.end_time = new Date(formData.end_time).toISOString();
      }
      if (formData.capacity !== undefined) {
        updateData.capacity = formData.capacity ? parseInt(formData.capacity) : null;
      }

      const response = await fetch(`${compositeServiceUrl}/api/events/${editingEvent.event_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(updateData)
      });

      // Log eTag from response (if present)
      const etag = response.headers.get('ETag') || response.headers.get('etag');
      if (etag) {
        console.log('📅 Events Service - eTag received (PUT):', etag);
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update event');
      }

      setSuccess('Event updated successfully!');
      resetForm();
      fetchEvents();
    } catch (error: any) {
      console.error('Error updating event:', error);
      setError(error.message || 'Failed to update event');
    }
  };

  const handleEditClick = (event: Event) => {
    setEditingEvent(event);
    const formatForInput = (isoString: string) => {
      const date = new Date(isoString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };
    
    setFormData({
      title: event.title,
      description: event.description || '',
      location: event.location || '',
      start_time: formatForInput(event.start_time),
      end_time: formatForInput(event.end_time),
      capacity: event.capacity?.toString() || ''
    });
    setShowCreateForm(true);
  };

  const formatDate = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return date.toLocaleDateString();
  };

  const formatTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!currentUser) {
    return (
      <div className="events-container">
        <div className="events-message">Please log in to view and manage events.</div>
      </div>
    );
  }

  return (
    <div className="events-container">
      <div className="events-header">
        <h2>Events</h2>
        <button 
          className="events-create-button" 
          onClick={() => {
            resetForm();
            setShowCreateForm(true);
          }}
        >
          {editingEvent ? 'Cancel Edit' : '+ Create Event'}
        </button>
      </div>

      {error && <div className="events-error">{error}</div>}
      {success && <div className="events-success">{success}</div>}

      {showCreateForm && (
        <div className="events-form-container">
          <h3>{editingEvent ? 'Edit Event' : 'Create New Event'}</h3>
          <form onSubmit={editingEvent ? handleUpdateEvent : handleCreateEvent}>
            <div className="events-form-group">
              <label htmlFor="title">Title *</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                placeholder="Event title"
              />
            </div>

            <div className="events-form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                placeholder="Event description"
              />
            </div>

            <div className="events-form-group">
              <label htmlFor="location">Location</label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="Event location"
              />
            </div>

            <div className="events-form-row">
              <div className="events-form-group">
                <label htmlFor="start_time">Start Time *</label>
                <input
                  type="datetime-local"
                  id="start_time"
                  name="start_time"
                  value={formData.start_time}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="events-form-group">
                <label htmlFor="end_time">End Time *</label>
                <input
                  type="datetime-local"
                  id="end_time"
                  name="end_time"
                  value={formData.end_time}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="events-form-group">
              <label htmlFor="capacity">Capacity</label>
              <input
                type="number"
                id="capacity"
                name="capacity"
                value={formData.capacity}
                onChange={handleInputChange}
                min="1"
                placeholder="Maximum attendees"
              />
            </div>

            <div className="events-form-actions">
              <button type="submit" className="events-submit-button">
                {editingEvent ? 'Update Event' : 'Create Event'}
              </button>
              <button 
                type="button" 
                className="events-cancel-button"
                onClick={resetForm}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="events-loading">Loading events...</div>
      ) : events.length === 0 ? (
        <div className="events-message">No events found. Create your first event!</div>
      ) : (
        <div className="events-table-container">
          <table className="events-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Date</th>
                <th>Time</th>
                <th>Location</th>
                <th>Capacity</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.event_id}>
                  <td>
                    <div className="event-title-cell">
                      <strong>{event.title}</strong>
                      {event.description && (
                        <div className="event-description">{event.description}</div>
                      )}
                    </div>
                  </td>
                  <td>{formatDate(event.start_time)}</td>
                  <td>
                    <div>{formatTime(event.start_time)}</div>
                    <div className="event-time-end">to {formatTime(event.end_time)}</div>
                  </td>
                  <td>{event.location || '-'}</td>
                  <td>{event.capacity || 'Unlimited'}</td>
                  <td>
                    {event.canRegister ? (
                      <span className="event-status-available">Available</span>
                    ) : (
                      <span className="event-status-conflict" title={event.conflictReason}>
                        Conflict
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="event-actions">
                      {event.canRegister && (
                        <button 
                          className="event-register-button"
                          onClick={() => {
                            // TODO: Implement registration
                            alert('Registration functionality to be implemented');
                          }}
                        >
                          Register
                        </button>
                      )}
                      {event.created_by === userProfile?.user_id && (
                        <button
                          className="event-edit-button"
                          onClick={() => handleEditClick(event)}
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Events;
