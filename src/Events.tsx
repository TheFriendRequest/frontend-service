import React, { useState, useEffect } from 'react';
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
}

interface EventFormData {
  title: string;
  description: string;
  location: string;
  start_time: string;
  end_time: string;
  capacity: string;
}

const Events: React.FC = () => {
  const { idToken, currentUser } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
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

  const eventServiceUrl = process.env.REACT_APP_EVENTS_SERVICE_URL || 'http://localhost:8080';

  useEffect(() => {
    if (idToken) {
      fetchEvents();
    }
  }, [idToken]);

  const fetchEvents = async () => {
    if (!idToken) return;
    
    try {
      setLoading(true);
      const response = await fetch(`${eventServiceUrl}/events/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }

      const data = await response.json();
      setEvents(data);
    } catch (error: any) {
      console.error('Error fetching events:', error);
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

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
      // Convert datetime-local format to ISO format
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

      const response = await fetch(`${eventServiceUrl}/events/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(eventData)
      });

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

      const response = await fetch(`${eventServiceUrl}/events/${editingEvent.event_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(updateData)
      });

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
    // Convert ISO datetime to datetime-local format (YYYY-MM-DDTHH:mm)
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

  const formatDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return date.toLocaleString();
  };

  if (!currentUser) {
    return (
      <div className="events-container">
        <div className="events-message">
          Please log in to view and manage events.
        </div>
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
        <div className="events-list">
          {events.map((event) => (
            <div key={event.event_id} className="events-card">
              <div className="events-card-header">
                <h3>{event.title}</h3>
                <button
                  className="events-edit-button"
                  onClick={() => handleEditClick(event)}
                >
                  Edit
                </button>
              </div>
              {event.description && (
                <p className="events-description">{event.description}</p>
              )}
              <div className="events-details">
                {event.location && (
                  <div className="events-detail-item">
                    <strong>Location:</strong> {event.location}
                  </div>
                )}
                <div className="events-detail-item">
                  <strong>Start:</strong> {formatDateTime(event.start_time)}
                </div>
                <div className="events-detail-item">
                  <strong>End:</strong> {formatDateTime(event.end_time)}
                </div>
                {event.capacity && (
                  <div className="events-detail-item">
                    <strong>Capacity:</strong> {event.capacity}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Events;

