import React from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

// Styles from main.jsx
const btnPrimary = { background:'var(--brand)', color:'#ffffff', padding:'10px 14px', borderRadius:12, textDecoration:'none', fontWeight:700, boxShadow:'var(--shadow)' };
const btnOutline = { border:'1px solid var(--border)', color:'var(--text)', padding:'10px 14px', borderRadius:12, textDecoration:'none', fontWeight:600, background:'var(--panel)' };

export default function FarmerDashboard() {
  // Collection Form State
  const [form, setForm] = React.useState({
    eventId: '',
    collectorId: '',
    species: '',
    latitude: '',
    longitude: '',
    timestamp: new Date().toISOString().slice(0, 16), // Current date/time
    photoUrl: ''
  });

  // User's collections
  const [collections, setCollections] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [success, setSuccess] = React.useState(false);

  // Get farmer ID from auth context
  const farmerId = localStorage.getItem('name') || '';

  // Load farmer's collections
  const loadCollections = async () => {
    try {
      const result = await axios.get('/collection-events');
      // Filter collections for this farmer
      const farmerCollections = (Array.isArray(result.data) ? result.data : [])
        .filter(c => c.collectorId === farmerId)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setCollections(farmerCollections);
    } catch (e) {
      console.error('Failed to load collections:', e);
      setCollections([]);
    } finally {
      setLoading(false);
    }
  };

  // Load collections on mount
  React.useEffect(() => {
    loadCollections();
  }, [farmerId]);

  // Auto-capture GPS coordinates
  const captureLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setForm(prev => ({
            ...prev,
            latitude: position.coords.latitude.toFixed(6),
            longitude: position.longitude.toFixed(6)
          }));
        },
        (error) => {
          console.error('Error getting location:', error);
          setError('Failed to get GPS coordinates. Please enter manually.');
        }
      );
    } else {
      setError('Geolocation is not supported by your browser');
    }
  };

  // Generate unique batch ID
  const generateEventId = () => {
    const timestamp = new Date().getTime();
    const random = Math.random().toString(36).substring(2, 8);
    return `EVENT-${timestamp}-${random}`;
  };

  // Submit collection
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);

    try {
      // Validate required fields
      const required = ['species', 'latitude', 'longitude'];
      const missing = required.filter(field => !form[field]);
      if (missing.length > 0) {
        throw new Error(`Missing required fields: ${missing.join(', ')}`);
      }

      // Prepare collection data
      const collectionData = {
        ...form,
        eventId: generateEventId(),
        collectorId: farmerId,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        timestamp: form.timestamp || new Date().toISOString()
      };

      // Submit to blockchain
      const response = await axios.post('/collection-event', collectionData);
      
      setSuccess(true);
      setForm({
        eventId: '',
        collectorId: '',
        species: '',
        latitude: '',
        longitude: '',
        timestamp: new Date().toISOString().slice(0, 16),
        photoUrl: ''
      });

      // Reload collections
      loadCollections();

    } catch (err) {
      console.error('Submit error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to submit collection');
    } finally {
      setSubmitting(false);
    }
  };

  const speciesList = [
    'Ashwagandha',
    'Turmeric',
    'Tulsi',
    'Brahmi',
    'Shatavari',
    'Moringa',
    'Neem',
    'Ginger',
    'Amla',
    'Guduchi'
  ];

  return (
    <div>
      <div style={{background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', padding: '40px', borderRadius: 20, marginBottom: 32}}>
        <h1 style={{fontSize: 36, fontWeight: 700, marginBottom: 8, color: '#14532d'}}>🌿 Farmer Dashboard</h1>
        <p style={{fontSize: 18, color: '#166534'}}>Record herb collections and manage your inventory</p>
      </div>

      {/* Collection Form */}
      <div style={{background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 32, boxShadow: 'var(--shadow)'}}>
        <h2 style={{color: '#1e293b', marginBottom: 24}}>Record New Collection</h2>

        <form onSubmit={handleSubmit}>
          <div style={{display: 'grid', gap: 20, marginBottom: 24}}>
            <div>
              <label style={{display: 'block', marginBottom: 8, color: '#1e293b', fontWeight: 500}}>
                Herb Species*
              </label>
              <select
                value={form.species}
                onChange={(e) => setForm(prev => ({...prev, species: e.target.value}))}
                required
                style={{width: '100%', padding: 12, borderRadius: 8, border: '1px solid var(--border)', background: 'white', fontSize: 16}}
              >
                <option value="">Select herb species</option>
                {speciesList.map(species => (
                  <option key={species} value={species}>{species}</option>
                ))}
              </select>
            </div>

            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16}}>
              <div>
                <label style={{display: 'block', marginBottom: 8, color: '#1e293b', fontWeight: 500}}>
                  Latitude*
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={form.latitude}
                  onChange={(e) => setForm(prev => ({...prev, latitude: e.target.value}))}
                  required
                  style={{width: '100%', padding: 12, borderRadius: 8, border: '1px solid var(--border)', background: 'white'}}
                />
              </div>
              <div>
                <label style={{display: 'block', marginBottom: 8, color: '#1e293b', fontWeight: 500}}>
                  Longitude*
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={form.longitude}
                  onChange={(e) => setForm(prev => ({...prev, longitude: e.target.value}))}
                  required
                  style={{width: '100%', padding: 12, borderRadius: 8, border: '1px solid var(--border)', background: 'white'}}
                />
              </div>
              <div style={{display: 'flex', alignItems: 'flex-end'}}>
                <button 
                  type="button"
                  onClick={captureLocation}
                  style={{...btnOutline, width: '100%'}}
                >
                  📍 Get Current Location
                </button>
              </div>
            </div>

            <div>
              <label style={{display: 'block', marginBottom: 8, color: '#1e293b', fontWeight: 500}}>
                Collection Date & Time*
              </label>
              <input
                type="datetime-local"
                value={form.timestamp}
                onChange={(e) => setForm(prev => ({...prev, timestamp: e.target.value}))}
                required
                style={{width: '100%', padding: 12, borderRadius: 8, border: '1px solid var(--border)', background: 'white'}}
              />
            </div>

            <div>
              <label style={{display: 'block', marginBottom: 8, color: '#1e293b', fontWeight: 500}}>
                Photo URL (Optional)
              </label>
              <input
                type="url"
                value={form.photoUrl}
                onChange={(e) => setForm(prev => ({...prev, photoUrl: e.target.value}))}
                placeholder="https://example.com/photo.jpg"
                style={{width: '100%', padding: 12, borderRadius: 8, border: '1px solid var(--border)', background: 'white'}}
              />
            </div>
          </div>

          {error && (
            <div style={{background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8, padding: 12, marginBottom: 16, color: '#dc2626'}}>
              ⚠️ {error}
            </div>
          )}

          {success && (
            <div style={{background: '#dcfce7', border: '1px solid #86efac', borderRadius: 8, padding: 12, marginBottom: 16, color: '#16a34a'}}>
              ✅ Collection recorded successfully!
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              ...btnPrimary,
              width: '100%',
              padding: '16px',
              opacity: submitting ? 0.7 : 1,
              cursor: submitting ? 'not-allowed' : 'pointer'
            }}
          >
            {submitting ? 'Recording...' : '🌿 Record Collection'}
          </button>
        </form>
      </div>

      {/* Collections List */}
      <div style={{background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, boxShadow: 'var(--shadow)'}}>
        <h2 style={{color: '#1e293b', marginBottom: 24}}>My Collections</h2>

        {loading ? (
          <div style={{textAlign: 'center', padding: '40px 20px', color: 'var(--muted)'}}>
            <div style={{fontSize: 48, marginBottom: 16}}>🔄</div>
            <p>Loading collections...</p>
          </div>
        ) : collections.length > 0 ? (
          <div style={{display: 'grid', gap: 16}}>
            {collections.map((collection) => (
              <div
                key={collection.eventId}
                style={{
                  background: 'white',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: 20,
                }}
              >
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 12}}>
                  <h3 style={{margin: 0, color: '#1e293b'}}>{collection.species}</h3>
                  <div style={{background: '#f0fdf4', color: '#16a34a', padding: '4px 12px', borderRadius: 20, fontSize: 14, fontWeight: 600}}>
                    ✅ Verified
                  </div>
                </div>

                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16}}>
                  <div>
                    <div style={{color: 'var(--muted)', fontSize: 14, marginBottom: 4}}>Collection ID</div>
                    <div style={{fontFamily: 'monospace', fontSize: 14}}>{collection.eventId}</div>
                  </div>
                  <div>
                    <div style={{color: 'var(--muted)', fontSize: 14, marginBottom: 4}}>Location</div>
                    <div style={{fontSize: 14}}>{collection.latitude}, {collection.longitude}</div>
                  </div>
                  <div>
                    <div style={{color: 'var(--muted)', fontSize: 14, marginBottom: 4}}>Date & Time</div>
                    <div style={{fontSize: 14}}>{new Date(collection.timestamp).toLocaleString()}</div>
                  </div>
                </div>

                <div style={{display: 'flex', gap: 8, marginTop: 16}}>
                  <Link
                    to={`/provenance?event=${collection.eventId}`}
                    style={{...btnOutline, padding: '8px 16px', fontSize: 14}}
                  >
                    🔍 View Details
                  </Link>
                  <Link
                    to={`/verify/${collection.eventId}`}
                    style={{...btnOutline, padding: '8px 16px', fontSize: 14}}
                  >
                    ⛓️ Verify on Blockchain
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{textAlign: 'center', padding: '40px 20px', color: 'var(--muted)'}}>
            <div style={{fontSize: 48, marginBottom: 16}}>📝</div>
            <p>No collections recorded yet. Use the form above to record your first collection.</p>
          </div>
        )}
      </div>
    </div>
  );
}
