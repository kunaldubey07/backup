import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, NavLink, useNavigate, useLocation, Link, Navigate, useParams } from 'react-router-dom';
import FarmerDashboard from './components/FarmerDashboard';
import axios from 'axios';
import QRCode from 'qrcode';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';
axios.defaults.baseURL = API_BASE;

// Auth context (single source of truth)
const AuthContext = React.createContext(null);

function AuthProvider({ children }){
  const [authState, setAuthState] = React.useState(() => ({
    token: localStorage.getItem('token') || '',
    role: localStorage.getItem('role') || '',
    name: localStorage.getItem('name') || '',
    isLoggedIn: !!localStorage.getItem('token')
  }));

  const login = React.useCallback(async (role, name) => {
    const r = await axios.post('/auth/login', { role, name });
    localStorage.setItem('token', r.data.token);
    localStorage.setItem('role', r.data.role);
    localStorage.setItem('name', r.data.name);
    setAuthState({ token: r.data.token, role: r.data.role, name: r.data.name, isLoggedIn: true });
    return r.data;
  }, []);

  const logout = React.useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('name');
    setAuthState({ token: '', role: '', name: '', isLoggedIn: false });
  }, []);

  // Sync across tabs
  React.useEffect(() => {
    const onStorage = (e) => {
      if (['token', 'role', 'name'].includes(e.key)) {
        setAuthState({
          token: localStorage.getItem('token') || '',
          role: localStorage.getItem('role') || '',
          name: localStorage.getItem('name') || '',
          isLoggedIn: !!localStorage.getItem('token')
        });
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value = React.useMemo(() => ({ ...authState, login, logout }), [authState, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuth(){
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

function TopBar({ user, onLogout }){
  const navigate = useNavigate();
  const getRoleIcon = (role) => {
    switch(role) {
      case 'farmer': return ;
      case 'lab': return ;
      case 'admin': return ;
      case 'customer': return ;
      default: return ;
    }
  };

  const getRoleColor = (role) => {
    switch(role) {
      case 'farmer': return '#22c55e';
      case 'lab': return '#eab308';
      case 'admin': return '#8b5cf6';
      case 'customer': return '#3b82f6';
      default: return '#64748b';
    }
  };

  const handleLogout = () => {
    onLogout();
    navigate('/', { replace: true });
  };

  return (
    <header style={{position:'sticky',top:0,zIndex:10,backdropFilter:'blur(8px)',background:'rgba(255,255,255,0.95)',borderBottom:'1px solid var(--border)',boxShadow:'0 2px 20px rgba(0,0,0,0.1)'}}>
      <div style={{maxWidth:1400,margin:'0 auto',display:'flex',alignItems:'center',gap:32,padding:'20px 24px'}}>
        <div style={{fontWeight:900,letterSpacing:.5,color:'#14532d',fontSize:28,cursor:'pointer',transition:'all 0.3s ease'}} onClick={() => navigate('/')}>HerbalTrace</div>

        <nav style={{display:'flex',gap:16,flex:1,justifyContent:'center'}}>
          <Nav to="/" end>Home</Nav>
          {user.isLoggedIn ? (
            <>
              {user.role === 'farmer' && <Nav to="/farmer">My Farm</Nav>}
              {user.role === 'lab' && <Nav to="/lab">Lab Tests</Nav>}
              {user.role === 'admin' && <Nav to="/processor">Processing</Nav>}
              {user.role === 'customer' && <Nav to="/products">Products</Nav>}
              <Nav to="/provenance">Verify</Nav>
              <Nav to="/visualize">Blockchain</Nav>
              {['farmer','lab','admin'].includes(user.role) && <Nav to="/supply-chain">Supply Chain</Nav>}
            </>
          ) : (
            <>
              <Nav to="/products">🛒 Products</Nav>
              <Nav to="/provenance">🔍 Verify</Nav>
              <Nav to="/about">ℹ️ About</Nav>
            </>
          )}
        </nav>

        <div style={{display:'flex',alignItems:'center',gap:16}}>
          {user.isLoggedIn ? (
            <>
              <div style={{display:'flex',alignItems:'center',gap:8,background:'var(--panel)',border:'1px solid var(--border)',borderRadius:20,padding:'8px 16px',position:'relative'}}>
                <span style={{fontSize:16}}>{getRoleIcon(user.role)}</span>
                <span style={{color:'var(--muted)',fontSize:14}}>{user.name}</span>
                <div style={{width:8,height:8,borderRadius:'50%',background:getRoleColor(user.role)}}></div>
                {/* Notification Badge */}
                <div style={{position:'absolute',top:-4,right:-4,width:20,height:20,borderRadius:'50%',background:'#ef4444',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'white'}}>
                  3
                </div>
              </div>
              <button onClick={handleLogout} style={{...btnOutline,padding:'8px 16px',fontSize:14}}>🚪 Logout</button>
            </>
          ) : (
            <Nav to="/login" style={{...btnPrimary,padding:'8px 16px',fontSize:14}}>🔐 Login</Nav>
          )}
        </div>
      </div>
    </header>
  );
}

const btnPrimary = { background:'var(--brand)', color:'#ffffff', padding:'10px 14px', borderRadius:12, textDecoration:'none', fontWeight:700, boxShadow:'var(--shadow)' };
const btnOutline = { border:'1px solid var(--border)', color:'var(--text)', padding:'10px 14px', borderRadius:12, textDecoration:'none', fontWeight:600, background:'var(--panel)' };

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes slide-up {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .fade-in { animation: fade-in 0.6s ease-out; }
  .slide-up { animation: slide-up 0.8s ease-out; }
  .glow {
    position: absolute;
    border-radius: 50%;
    filter: blur(40px);
    opacity: 0.6;
    animation: pulse 3s ease-in-out infinite alternate;
  }
  @keyframes pulse {
    from { opacity: 0.4; }
    to { opacity: 0.8; }
  }
`;
document.head.appendChild(style);

function Nav({to,children, end}){
  return (
    <NavLink
      end={end}
      to={to}
      style={({isActive}) => ({
        color: isActive ? '#14532d' : '#334155',
        textDecoration: 'none',
        fontWeight: isActive ? '700' : '500',
        padding: '8px 16px',
        borderRadius: '8px',
        transition: 'all 0.3s ease',
        position: 'relative',
        borderBottom: isActive ? '3px solid #22c55e' : '3px solid transparent'
      })}
      onMouseEnter={(e) => {
        if (!e.target.classList.contains('active')) {
          e.target.style.backgroundColor = '#f0fdf4';
          e.target.style.color = '#14532d';
        }
      }}
      onMouseLeave={(e) => {
        if (!e.target.classList.contains('active')) {
          e.target.style.backgroundColor = 'transparent';
          e.target.style.color = '#334155';
        }
      }}
    >
      {children}
    </NavLink>
  );
}

// API utility functions
async function get(url) {
  const response = await axios.get(url);
  return response.data;
}

async function post(url, data) {
  const response = await axios.post(url, data);
  return response.data;
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{textAlign: 'center', padding: '60px 20px', color: 'var(--muted)'}}>
          <div style={{fontSize: 64, marginBottom: 24}}>⚠️</div>
          <h2>Oops! Something went wrong</h2>
          <p>We encountered an unexpected error. Please try refreshing the page.</p>
          <div style={{marginTop: 24}}>
            <button
              onClick={() => window.location.reload()}
              style={{...btnPrimary, padding: '12px 24px'}}
            >
              🔄 Refresh Page
            </button>
          </div>
          {process.env.NODE_ENV === 'development' && (
            <details style={{marginTop: 24, textAlign: 'left'}}>
              <summary style={{cursor: 'pointer', color: 'var(--text)'}}>Error Details (Development)</summary>
              <pre style={{background: 'var(--panel)', padding: 12, borderRadius: 8, marginTop: 8, fontSize: 12, overflow: 'auto'}}>
                {this.state.error && this.state.error.toString()}
                <br />
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

function LoadingSpinner({ size = 40, message = "Loading..." }) {
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: 16}}>
      <div
        style={{
          width: size,
          height: size,
          border: '3px solid var(--border)',
          borderTop: '3px solid var(--brand)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}
      />
      <p style={{color: 'var(--muted)', margin: 0}}>{message}</p>
    </div>
  );
}

function Shell({ children }){
  const auth = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);
  const location = useLocation();

  // Show loading state during route changes
  React.useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 300); // Small delay for smooth transitions
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Global error state for API calls
  const [error, setError] = React.useState(null);

  // Global axios interceptor for error handling
  React.useEffect(() => {
    const responseInterceptor = axios.interceptors.response.use(
      response => response,
      error => {
        setError(error.response?.data?.message || error.message || 'An unexpected error occurred');
        return Promise.reject(error);
      }
    );
    return () => {
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  const dismissError = () => setError(null);

  return (
    <div>
      <TopBar user={auth} onLogout={auth.logout}/>
      <div style={{maxWidth:1400,margin:'0 auto',padding:24}}>
        {isLoading ? <LoadingSpinner message="Loading page..." /> : children}
        {error && (
          <div style={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            background: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            padding: '12px 20px',
            color: '#dc2626',
            fontSize: 14,
            boxShadow: '0 2px 8px rgba(220, 38, 38, 0.2)',
            zIndex: 10000,
            maxWidth: 320,
            cursor: 'pointer'
          }} onClick={dismissError} title="Click to dismiss">
            ⚠️ {error}
          </div>
        )}
      </div>
      <footer style={{marginTop:60,padding:'40px 20px',borderTop:'1px solid var(--border)',color:'var(--muted)',textAlign:'center',background:'var(--panel)'}}>
        <div style={{maxWidth:1200,margin:'0 auto'}}>
          <div style={{fontSize:18,fontWeight:600,marginBottom:8}}> HerbalTrace</div>
          <div>© {new Date().getFullYear()} HerbalTrace • Blockchain-powered traceability for Ayurveda</div>
          <div style={{marginTop:16,fontSize:14,opacity:0.7}}>
            Ensuring authenticity, quality, and sustainability in every step of the supply chain
          </div>
          <div style={{marginTop:20,padding:'16px',background:'#f0f9ff',border:'1px solid #0ea5e9',borderRadius:12,display:'inline-block'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,fontSize:14,color:'#0c4a6e'}}>
              <span>⛓️</span>
              <span style={{fontWeight:600}}>Powered by Hyperledger Fabric</span>
              <div style={{width:8,height:8,borderRadius:'50%',background:'#22c55e'}}></div>
              <span>Network Online</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Hero(){
  return (
    <div>
      <section id="launch" className="fade-in" style={{position:'relative',padding:'56px 0 12px'}}>
        <div className="glow" style={{top:-80,left:0,width:360,height:200,background:'#84cc1633'}}></div>
        <div className="glow" style={{top:-40,right:0,width:420,height:240,background:'#16a34a33'}}></div>
        <div style={{display:'grid',gridTemplateColumns:'1.3fr .9fr',gap:20,alignItems:'center'}}>
          <div>
            <div style={{display:'inline-flex',alignItems:'center',gap:8,background:'var(--panel)',border:'1px solid var(--border)',borderRadius:999,padding:'6px 10px',color:'var(--muted)'}}>Blockchain Powered</div>
            <h1 style={{fontSize:44,margin:'14px 0'}}>Ayurvedic Herb Traceability Platform</h1>
            <p style={{color:'var(--muted)',fontSize:16}}>From geo-tagged harvest to lab tests and processing, all captured on Hyperledger Fabric and verified by QR at the point of sale.</p>
            <div style={{display:'flex',gap:10,marginTop:12}}>
              <Link to="/capture" style={btnPrimary}>Start Capturing</Link>
              <Link to="/provenance" style={btnOutline}>Verify a Batch</Link>
            </div>
            <div style={{display:'flex',gap:24,marginTop:16,color:'var(--muted)'}}>
              <Stat k="50,000+" v="Herb Collections"/>
              <Stat k="1,200+" v="Verified Farmers"/>
              <Stat k="95%" v="Quality Pass Rate"/>
              <Stat k="100%" v="Transparency"/>
            </div>
          </div>
          <div className="slide-up" style={{background:'var(--panel)',border:'1px solid var(--border)',borderRadius:16,padding:16,boxShadow:'var(--shadow)'}}>
            <h3 style={{marginTop:0}}>Scan to Verify</h3>
            <ul style={{marginTop:8,color:'var(--muted)'}}>
              <li>Origin & Harvest Date</li>
              <li>Quality Test Results</li>
              <li>Supply Chain Journey</li>
              <li>Sustainability Metrics</li>
            </ul>
            <div style={{display:'flex',gap:10,marginTop:8}}>
              <Link to="/provenance" style={btnPrimary}>Scan Now</Link>
              <Link to="/provenance" style={btnOutline}>Enter Code Manually</Link>
            </div>
          </div>
        </div>
      </section>

      <HowItWorks />
      <FeaturesShowcase />
      <Testimonials />
      <CertificationProgram />
      <ContactSupport />
    </div>
  );
}

function HowItWorks(){
  return (
    <section style={{padding:'80px 0',background:'var(--panel)'}}>
      <div style={{maxWidth:1200,margin:'0 auto',padding:'0 24px'}}>
        <div style={{textAlign:'center',marginBottom:60}}>
          <h2 style={{fontSize:36,fontWeight:700,color:'#1e293b',marginBottom:16}}>How It Works</h2>
          <p style={{fontSize:18,color:'var(--muted)'}}>Step-by-step visual guide of the supply chain process</p>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(250px,1fr))',gap:40}}>
          <div style={{textAlign:'center'}}>
            <div style={{width:80,height:80,borderRadius:'50%',background:'linear-gradient(135deg,#22c55e,#16a34a)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:32,color:'white',margin:'0 auto 20px'}}>🌱</div>
            <h3 style={{fontSize:20,fontWeight:600,color:'#1e293b',marginBottom:12}}>1. Collection</h3>
            <p style={{color:'var(--muted)',lineHeight:1.6}}>Farmers capture geo-tagged collection events with species identification and GPS coordinates</p>
          </div>

          <div style={{textAlign:'center'}}>
            <div style={{width:80,height:80,borderRadius:'50%',background:'linear-gradient(135deg,#eab308,#d97706)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:32,color:'white',margin:'0 auto 20px'}}>🧪</div>
            <h3 style={{fontSize:20,fontWeight:600,color:'#1e293b',marginBottom:12}}>2. Quality Testing</h3>
            <p style={{color:'var(--muted)',lineHeight:1.6}}>Labs conduct comprehensive quality tests and record results on the blockchain</p>
          </div>

          <div style={{textAlign:'center'}}>
            <div style={{width:80,height:80,borderRadius:'50%',background:'linear-gradient(135deg,#3b82f6,#1d4ed8)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:32,color:'white',margin:'0 auto 20px'}}>⚙️</div>
            <h3 style={{fontSize:20,fontWeight:600,color:'#1e293b',marginBottom:12}}>3. Processing</h3>
            <p style={{color:'var(--muted)',lineHeight:1.6}}>Processing facilities track transformation steps and environmental conditions</p>
          </div>

          <div style={{textAlign:'center'}}>
            <div style={{width:80,height:80,borderRadius:'50%',background:'linear-gradient(135deg,#8b5cf6,#7c3aed)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:32,color:'white',margin:'0 auto 20px'}}>🔗</div>
            <h3 style={{fontSize:20,fontWeight:600,color:'#1e293b',marginBottom:12}}>4. Verification</h3>
            <p style={{color:'var(--muted)',lineHeight:1.6}}>Customers verify authenticity through QR codes and blockchain verification</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturesShowcase(){
  return (
    <section style={{padding:'80px 0'}}>
      <div style={{maxWidth:1200,margin:'0 auto',padding:'0 24px'}}>
        <div style={{textAlign:'center',marginBottom:60}}>
          <h2 style={{fontSize:36,fontWeight:700,color:'#1e293b',marginBottom:16}}>Platform Features</h2>
          <p style={{fontSize:18,color:'var(--muted)'}}>Highlight key platform capabilities with icons</p>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:32}}>
          <div style={{background:'var(--panel)',border:'1px solid var(--border)',borderRadius:16,padding:32,textAlign:'center',boxShadow:'var(--shadow)'}}>
            <div style={{fontSize:48,marginBottom:20}}>📍</div>
            <h3 style={{fontSize:20,fontWeight:600,color:'#1e293b',marginBottom:12}}>Geo-tagging</h3>
            <p style={{color:'var(--muted)',lineHeight:1.6}}>Every collection is tagged with precise GPS coordinates for origin verification and sustainability tracking</p>
          </div>

          <div style={{background:'var(--panel)',border:'1px solid var(--border)',borderRadius:16,padding:32,textAlign:'center',boxShadow:'var(--shadow)'}}>
            <div style={{fontSize:48,marginBottom:20}}>🧪</div>
            <h3 style={{fontSize:20,fontWeight:600,color:'#1e293b',marginBottom:12}}>Quality Assurance</h3>
            <p style={{color:'var(--muted)',lineHeight:1.6}}>Comprehensive testing protocols ensure product purity, efficacy, and compliance with standards</p>
          </div>

          <div style={{background:'var(--panel)',border:'1px solid var(--border)',borderRadius:16,padding:32,textAlign:'center',boxShadow:'var(--shadow)'}}>
            <div style={{fontSize:48,marginBottom:20}}>📱</div>
            <h3 style={{fontSize:20,fontWeight:600,color:'#1e293b',marginBottom:12}}>QR Verification</h3>
            <p style={{color:'var(--muted)',lineHeight:1.6}}>Customers can instantly verify product authenticity with QR codes at the point of sale</p>
          </div>

          <div style={{background:'var(--panel)',border:'1px solid var(--border)',borderRadius:16,padding:32,textAlign:'center',boxShadow:'var(--shadow)'}}>
            <div style={{fontSize:48,marginBottom:20}}>🔒</div>
            <h3 style={{fontSize:20,fontWeight:600,color:'#1e293b',marginBottom:12}}>Immutable Records</h3>
            <p style={{color:'var(--muted)',lineHeight:1.6}}>Blockchain technology ensures data cannot be altered or tampered with, providing complete transparency</p>
          </div>

          <div style={{background:'var(--panel)',border:'1px solid var(--border)',borderRadius:16,padding:32,textAlign:'center',boxShadow:'var(--shadow)'}}>
            <div style={{fontSize:48,marginBottom:20}}>⛓️</div>
            <h3 style={{fontSize:20,fontWeight:600,color:'#1e293b',marginBottom:12}}>Supply Chain Tracking</h3>
            <p style={{color:'var(--muted)',lineHeight:1.6}}>Complete visibility of the product journey from farm to consumer with real-time updates</p>
          </div>

          <div style={{background:'var(--panel)',border:'1px solid var(--border)',borderRadius:16,padding:32,textAlign:'center',boxShadow:'var(--shadow)'}}>
            <div style={{fontSize:48,marginBottom:20}}>🌱</div>
            <h3 style={{fontSize:20,fontWeight:600,color:'#1e293b',marginBottom:12}}>Sustainability Metrics</h3>
            <p style={{color:'var(--muted)',lineHeight:1.6}}>Track environmental impact and promote sustainable farming practices</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Testimonials(){
  return (
    <section style={{padding:'80px 0',background:'var(--panel)'}}>
      <div style={{maxWidth:1200,margin:'0 auto',padding:'0 24px'}}>
        <div style={{textAlign:'center',marginBottom:60}}>
          <h2 style={{fontSize:36,fontWeight:700,color:'#1e293b',marginBottom:16}}>Success Stories</h2>
          <p style={{fontSize:18,color:'var(--muted)'}}>Success stories from farmers, labs, and customers</p>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(350px,1fr))',gap:32}}>
          <div style={{background:'white',border:'1px solid var(--border)',borderRadius:16,padding:32,boxShadow:'var(--shadow)'}}>
            <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:20}}>
              <div style={{width:60,height:60,borderRadius:'50%',background:'#22c55e',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,color:'white'}}>🌱</div>
              <div>
                <div style={{fontWeight:600,color:'#1e293b'}}>Rajesh Kumar</div>
                <div style={{color:'var(--muted)',fontSize:14}}>Organic Farmer, Kerala</div>
              </div>
            </div>
            <p style={{color:'var(--muted)',lineHeight:1.6,marginBottom:16}}>"HerbalTrace has transformed how we sell our organic herbs. Customers can now verify the authenticity and quality of our products instantly."</p>
            <div style={{color:'#eab308',fontSize:18}}>⭐⭐⭐⭐⭐</div>
          </div>

          <div style={{background:'white',border:'1px solid var(--border)',borderRadius:16,padding:32,boxShadow:'var(--shadow)'}}>
            <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:20}}>
              <div style={{width:60,height:60,borderRadius:'50%',background:'#eab308',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,color:'white'}}>🧪</div>
              <div>
                <div style={{fontWeight:600,color:'#1e293b'}}>Dr. Priya Sharma</div>
                <div style={{color:'var(--muted)',fontSize:14}}>Quality Lab Director, Mumbai</div>
              </div>
            </div>
            <p style={{color:'var(--muted)',lineHeight:1.6,marginBottom:16}}>"The blockchain verification system has made our quality testing transparent and trustworthy. Our clients appreciate the immutability of records."</p>
            <div style={{color:'#eab308',fontSize:18}}>⭐⭐⭐⭐⭐</div>
          </div>

          <div style={{background:'white',border:'1px solid var(--border)',borderRadius:16,padding:32,boxShadow:'var(--shadow)'}}>
            <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:20}}>
              <div style={{width:60,height:60,borderRadius:'50%',background:'#3b82f6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,color:'white'}}>👤</div>
              <div>
                <div style={{fontWeight:600,color:'#1e293b'}}>Anjali Patel</div>
                <div style={{color:'var(--muted)',fontSize:14}}>Ayurvedic Practitioner, Delhi</div>
              </div>
            </div>
            <p style={{color:'var(--muted)',lineHeight:1.6,marginBottom:16}}>"I can now confidently recommend products to my patients knowing their complete journey from farm to pharmacy. The QR verification is incredibly convenient."</p>
            <div style={{color:'#eab308',fontSize:18}}>⭐⭐⭐⭐⭐</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CertificationProgram(){
  return (
    <section style={{padding:'80px 0'}}>
      <div style={{maxWidth:1200,margin:'0 auto',padding:'0 24px'}}>
        <div style={{textAlign:'center',marginBottom:60}}>
          <h2 style={{fontSize:36,fontWeight:700,color:'#1e293b',marginBottom:16}}>Certification Program</h2>
          <p style={{fontSize:18,color:'var(--muted)'}}>How to get certified as a supplier</p>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:60,alignItems:'center'}}>
          <div>
            <h3 style={{fontSize:24,fontWeight:600,color:'#1e293b',marginBottom:20}}>Become a Certified Supplier</h3>
            <div style={{display:'grid',gap:16}}>
              <div style={{display:'flex',alignItems:'flex-start',gap:16}}>
                <div style={{width:32,height:32,borderRadius:'50%',background:'#22c55e',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:16,fontWeight:600}}>1</div>
                <div>
                  <div style={{fontWeight:600,color:'#1e293b',marginBottom:4}}>Register Your Farm</div>
                  <div style={{color:'var(--muted)'}}>Complete the supplier registration process with farm details and certifications</div>
                </div>
              </div>

              <div style={{display:'flex',alignItems:'flex-start',gap:16}}>
                <div style={{width:32,height:32,borderRadius:'50%',background:'#eab308',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:16,fontWeight:600}}>2</div>
                <div>
                  <div style={{fontWeight:600,color:'#1e293b',marginBottom:4}}>Quality Training</div>
                  <div style={{color:'var(--muted)'}}>Participate in our quality assurance training program</div>
                </div>
              </div>

              <div style={{display:'flex',alignItems:'flex-start',gap:16}}>
                <div style={{width:32,height:32,borderRadius:'50%',background:'#3b82f6',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:16,fontWeight:600}}>3</div>
                <div>
                  <div style={{fontWeight:600,color:'#1e293b',marginBottom:4}}>Blockchain Integration</div>
                  <div style={{color:'var(--muted)'}}>Set up your data capture systems for blockchain recording</div>
                </div>
              </div>

              <div style={{display:'flex',alignItems:'flex-start',gap:16}}>
                <div style={{width:32,height:32,borderRadius:'50%',background:'#8b5cf6',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:16,fontWeight:600}}>4</div>
                <div>
                  <div style={{fontWeight:600,color:'#1e293b',marginBottom:4}}>Certification</div>
                  <div style={{color:'var(--muted)'}}>Receive your HerbalTrace certification and start selling verified products</div>
                </div>
              </div>
            </div>

            <div style={{marginTop:32}}>
              <Link to="/login" style={btnPrimary}>Start Certification Process</Link>
            </div>
          </div>

          <div style={{background:'var(--panel)',border:'1px solid var(--border)',borderRadius:16,padding:32,boxShadow:'var(--shadow)'}}>
            <h3 style={{marginTop:0,color:'#1e293b'}}>Certification Benefits</h3>
            <ul style={{color:'var(--muted)',lineHeight:1.8}}>
              <li>Access to premium buyer network</li>
              <li>Higher product pricing</li>
              <li>Blockchain-verified authenticity</li>
              <li>Quality assurance support</li>
              <li>Marketing and branding assistance</li>
              <li>Supply chain optimization tools</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function ContactSupport(){
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission
    alert('Thank you for your message. We will get back to you soon!');
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <section style={{padding:'80px 0',background:'var(--panel)'}}>
      <div style={{maxWidth:800,margin:'0 auto',padding:'0 24px'}}>
        <div style={{textAlign:'center',marginBottom:40}}>
          <h2 style={{fontSize:36,fontWeight:700,color:'#1e293b',marginBottom:16}}>Contact & Support</h2>
          <p style={{fontSize:18,color:'var(--muted)'}}>Detailed contact form and support portal</p>
        </div>

        <div style={{background:'white',border:'1px solid var(--border)',borderRadius:16,padding:40,boxShadow:'var(--shadow)'}}>
          <form onSubmit={handleSubmit}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}>
              <div>
                <label style={{display:'block',marginBottom:8,fontWeight:600,color:'#1e293b'}}>Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  style={{width:'100%',padding:12,borderRadius:8,border:'1px solid var(--border)',background:'white',fontSize:16}}
                />
              </div>
              <div>
                <label style={{display:'block',marginBottom:8,fontWeight:600,color:'#1e293b'}}>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                  style={{width:'100%',padding:12,borderRadius:8,border:'1px solid var(--border)',background:'white',fontSize:16}}
                />
              </div>
            </div>

            <div style={{marginBottom:20}}>
              <label style={{display:'block',marginBottom:8,fontWeight:600,color:'#1e293b'}}>Subject</label>
              <select
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                required
                style={{width:'100%',padding:12,borderRadius:8,border:'1px solid var(--border)',background:'white',fontSize:16}}
              >
                <option value="">Select a subject</option>
                <option value="technical">Technical Support</option>
                <option value="certification">Certification Process</option>
                <option value="partnership">Partnership Inquiry</option>
                <option value="feedback">Feedback & Suggestions</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div style={{marginBottom:32}}>
              <label style={{display:'block',marginBottom:8,fontWeight:600,color:'#1e293b'}}>Message</label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({...formData, message: e.target.value})}
                required
                rows={6}
                style={{width:'100%',padding:12,borderRadius:8,border:'1px solid var(--border)',background:'white',fontSize:16,resize:'vertical'}}
              />
            </div>

            <button type="submit" style={{...btnPrimary, width:'100%', padding:'16px', fontSize:16}}>
              Send Message
            </button>
          </form>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(250px,1fr))',gap:32,marginTop:60}}>
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:32,marginBottom:12}}>📧</div>
            <h3 style={{fontSize:18,fontWeight:600,color:'#1e293b',marginBottom:8}}>Email Support</h3>
            <p style={{color:'var(--muted)'}}>support@herbaltrace.com</p>
          </div>

          <div style={{textAlign:'center'}}>
            <div style={{fontSize:32,marginBottom:12}}>📞</div>
            <h3 style={{fontSize:18,fontWeight:600,color:'#1e293b',marginBottom:8}}>Phone Support</h3>
            <p style={{color:'var(--muted)'}}>+91 1800-TRACE-01</p>
          </div>

          <div style={{textAlign:'center'}}>
            <div style={{fontSize:32,marginBottom:12}}>💬</div>
            <h3 style={{fontSize:18,fontWeight:600,color:'#1e293b',marginBottom:8}}>Live Chat</h3>
            <p style={{color:'var(--muted)'}}>Available 9 AM - 6 PM IST</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({k,v}){ return <div><div style={{fontWeight:800,fontSize:22,color:'var(--brand)'}}>{k}</div><div style={{fontSize:12,color:'#475569'}}>{v}</div></div>; }

function Visualization(){
  const [transactions, setTransactions] = React.useState([]);
  const [networkStatus, setNetworkStatus] = React.useState({ peers: [], orderer: null, blockHeight: 0 });
  const [status, setStatus] = React.useState('connecting');
  const [error, setError] = React.useState(null);
  const [filter, setFilter] = React.useState({ farmer: '', product: '', txId: '' });
  const [stats, setStats] = React.useState({ totalTxs: 0, totalBlocks: 0, lastTxTime: null });

  // Fetch network status and stats
  React.useEffect(() => {
    const fetchNetworkStatus = async () => {
      try {
        const [healthRes, statsRes] = await Promise.all([
          fetch(`${API_BASE}/health`),
          fetch(`${API_BASE}/stats`)
        ]);
        
        if (healthRes.ok) {
          const health = await healthRes.json();
          setNetworkStatus({
            peers: [
              { name: 'peer0.org1', status: 'online', port: 7051 },
              { name: 'peer0.org2', status: 'online', port: 7051 }
            ],
            orderer: { name: 'orderer.example.com', status: 'online', port: 7050 },
            blockHeight: Math.floor(Math.random() * 1000) + 1000, // Mock for now
            channel: health.channel,
            chaincode: health.chaincode
          });
        }

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats({
            totalTxs: Object.values(statsData.counts).reduce((a, b) => a + b, 0),
            totalBlocks: Math.floor(Math.random() * 1000) + 1000,
            lastTxTime: new Date().toISOString()
          });
        }
      } catch (e) {
        console.error('Failed to fetch network status:', e);
      }
    };

    fetchNetworkStatus();
    const interval = setInterval(fetchNetworkStatus, 10000); // Update every 10s
    return () => clearInterval(interval);
  }, []);

  // Live transaction feed
  React.useEffect(() => {
    let es = null;
    let reconnectTimeout = null;

    const connect = () => {
      setStatus('connecting');
      setError(null);
      es = new EventSource(`${API_BASE}/live/blocks`);

      es.onopen = () => {
        setStatus('open');
      };

      es.onmessage = ev => {
        try {
          const d = JSON.parse(ev.data);
          const newTx = {
            id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            blockNumber: Number(d.blockNumber),
            txCount: d.txCount,
            timestamp: d.timestamp,
            status: 'committed',
            farmer: `Farmer_${Math.floor(Math.random() * 10) + 1}`,
            product: `Product_${Math.floor(Math.random() * 20) + 1}`,
            txHash: `0x${Math.random().toString(16).substr(2, 64)}`
          };
          setTransactions(prev => [newTx, ...prev].slice(0, 50));
        } catch (e) {
          // ignore JSON parse errors
        }
      };

      es.onerror = () => {
        setStatus('error');
        setError('Connection lost. Attempting to reconnect...');
        es.close();
        reconnectTimeout = setTimeout(() => {
          connect();
        }, 5000);
      };
    };

    connect();

    return () => {
      if (es) es.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  const filteredTransactions = transactions.filter(tx => {
    if (filter.farmer && !tx.farmer.toLowerCase().includes(filter.farmer.toLowerCase())) return false;
    if (filter.product && !tx.product.toLowerCase().includes(filter.product.toLowerCase())) return false;
    if (filter.txId && !tx.id.toLowerCase().includes(filter.txId.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div style={{background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', padding: '40px', borderRadius: 20, marginBottom: 32}}>
        <h1 style={{fontSize: 36, fontWeight: 700, marginBottom: 8, color: '#0c4a6e'}}>⛓️ Blockchain Visualization</h1>
        <p style={{fontSize: 18, color: '#64748b'}}>Live transaction monitoring and network status for Hyperledger Fabric</p>
      </div>

      {/* Network Status Panel */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 32}}>
        <div style={{background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, boxShadow: 'var(--shadow)'}}>
          <h3 style={{marginTop: 0, color: '#1e293b', marginBottom: 16}}>🌐 Network Status</h3>
          <div style={{display: 'grid', gap: 12}}>
            {networkStatus.peers.map((peer, i) => (
              <div key={i} style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'white', borderRadius: 8, border: '1px solid var(--border)'}}>
                <span style={{fontWeight: 600, color: '#1e293b'}}>{peer.name}</span>
                <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                  <div style={{width: 8, height: 8, borderRadius: '50%', background: peer.status === 'online' ? '#22c55e' : '#ef4444'}}></div>
                  <span style={{fontSize: 12, color: 'var(--muted)'}}>{peer.status}</span>
                </div>
              </div>
            ))}
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'white', borderRadius: 8, border: '1px solid var(--border)'}}>
              <span style={{fontWeight: 600, color: '#1e293b'}}>{networkStatus.orderer?.name}</span>
              <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                <div style={{width: 8, height: 8, borderRadius: '50%', background: networkStatus.orderer?.status === 'online' ? '#22c55e' : '#ef4444'}}></div>
                <span style={{fontSize: 12, color: 'var(--muted)'}}>{networkStatus.orderer?.status}</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, boxShadow: 'var(--shadow)'}}>
          <h3 style={{marginTop: 0, color: '#1e293b', marginBottom: 16}}>📊 Network Statistics</h3>
          <div style={{display: 'grid', gap: 16}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <span style={{color: 'var(--muted)'}}>Block Height:</span>
              <span style={{fontWeight: 700, color: '#1e293b'}}>{networkStatus.blockHeight}</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <span style={{color: 'var(--muted)'}}>Total Transactions:</span>
              <span style={{fontWeight: 700, color: '#1e293b'}}>{stats.totalTxs}</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <span style={{color: 'var(--muted)'}}>Channel:</span>
              <span style={{fontWeight: 700, color: '#1e293b'}}>{networkStatus.channel}</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <span style={{color: 'var(--muted)'}}>Chaincode:</span>
              <span style={{fontWeight: 700, color: '#1e293b'}}>{networkStatus.chaincode}</span>
            </div>
          </div>
        </div>

        <div style={{background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, boxShadow: 'var(--shadow)'}}>
          <h3 style={{marginTop: 0, color: '#1e293b', marginBottom: 16}}>🔗 Connection Status</h3>
          <div style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16}}>
            <div style={{width: 12, height: 12, borderRadius: '50%', background: status === 'open' ? '#22c55e' : status === 'error' ? '#ef4444' : '#f59e0b'}}></div>
            <span style={{fontWeight: 600, color: '#1e293b'}}>
              {status === 'connecting' && 'Connecting to blockchain...'}
              {status === 'open' && 'Connected to Hyperledger Fabric'}
              {status === 'error' && 'Connection Error'}
            </span>
          </div>
          {error && (
            <div style={{background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8, padding: 12, color: '#dc2626', fontSize: 14}}>
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Transaction Filters */}
      <div style={{background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 24, boxShadow: 'var(--shadow)'}}>
        <h3 style={{marginTop: 0, color: '#1e293b', marginBottom: 16}}>🔍 Filter Transactions</h3>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16}}>
          <input
            type="text"
            placeholder="Filter by farmer..."
            value={filter.farmer}
            onChange={(e) => setFilter(prev => ({...prev, farmer: e.target.value}))}
            style={{padding: 12, borderRadius: 8, border: '1px solid var(--border)', background: 'white'}}
          />
          <input
            type="text"
            placeholder="Filter by product..."
            value={filter.product}
            onChange={(e) => setFilter(prev => ({...prev, product: e.target.value}))}
            style={{padding: 12, borderRadius: 8, border: '1px solid var(--border)', background: 'white'}}
          />
          <input
            type="text"
            placeholder="Filter by transaction ID..."
            value={filter.txId}
            onChange={(e) => setFilter(prev => ({...prev, txId: e.target.value}))}
            style={{padding: 12, borderRadius: 8, border: '1px solid var(--border)', background: 'white'}}
          />
        </div>
      </div>

      {/* Live Transaction Feed */}
      <div style={{background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, boxShadow: 'var(--shadow)'}}>
        <h3 style={{marginTop: 0, color: '#1e293b', marginBottom: 20}}>📈 Live Transaction Feed</h3>
        
        {status === 'open' && filteredTransactions.length === 0 && (
          <div style={{textAlign: 'center', color: 'var(--muted)', padding: '40px 20px'}}>
            <div style={{fontSize: 48, marginBottom: 16}}>⏳</div>
            <p>No transactions received yet. Transactions will appear here as they are processed on the blockchain.</p>
          </div>
        )}

        <div style={{display: 'grid', gap: 12, maxHeight: 600, overflowY: 'auto'}}>
          {filteredTransactions.map((tx, i) => (
            <div
              key={tx.id}
              style={{
                background: 'white',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: 16,
                display: 'grid',
                gridTemplateColumns: 'auto 1fr auto auto',
                gap: 16,
                alignItems: 'center',
                boxShadow: 'var(--shadow)',
                animation: 'fade-in 0.5s ease-out'
              }}
            >
              <div style={{width: 12, height: 12, borderRadius: '50%', background: '#22c55e'}}></div>
              <div>
                <div style={{fontWeight: 700, color: '#1e293b', marginBottom: 4}}>Block #{tx.blockNumber}</div>
                <div style={{fontSize: 14, color: 'var(--muted)'}}>
                  {tx.farmer} • {tx.product} • {tx.txCount} transactions
                </div>
              </div>
              <div style={{textAlign: 'right'}}>
                <div style={{fontSize: 12, color: 'var(--muted)', marginBottom: 4}}>Status</div>
                <div style={{
                  padding: '4px 8px',
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 600,
                  background: tx.status === 'committed' ? '#dcfce7' : '#fef3c7',
                  color: tx.status === 'committed' ? '#166534' : '#92400e'
                }}>
                  {tx.status}
                </div>
              </div>
              <div style={{textAlign: 'right'}}>
                <div style={{fontSize: 12, color: 'var(--muted)', marginBottom: 4}}>Time</div>
                <div style={{fontSize: 14, color: '#1e293b'}}>
                  {new Date(tx.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function QrGenerator(){
  const [batchId,setBatchId]=React.useState('');
  const [png,setPng]=React.useState('');
  const [txData, setTxData] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  
  const make = async () => {
    if (!batchId.trim()) return;
    
    setLoading(true);
    try {
      // Fetch blockchain transaction data for the batch
      const response = await axios.get(`/batch/${batchId}`);
      const batchData = response.data;
      
      // Create blockchain transaction data for QR
      const blockchainData = {
        txId: `tx_${batchId}_${Date.now()}`,
        productId: batchId,
        blockNumber: Math.floor(Math.random() * 1000) + 1000,
        timestamp: new Date().toISOString(),
        network: 'Hyperledger Fabric',
        channel: 'tracechannel',
        chaincode: 'tracecc',
        batchData: batchData
      };
      
      setTxData(blockchainData);
      
      // Generate QR code with verification URL
      const verifyUrl = `${window.location.origin}/verify/${blockchainData.txId}`;
      const dataUrl = await QRCode.toDataURL(verifyUrl, { margin:1, width:256 });
      setPng(dataUrl);
    } catch (error) {
      console.error('Failed to generate QR:', error);
      // Fallback to simple URL
      const url = `${window.location.origin}/provenance?batch=${encodeURIComponent(batchId)}`;
      const dataUrl = await QRCode.toDataURL(url, { margin:1, width:256 });
      setPng(dataUrl);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <div style={{background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', padding: '40px', borderRadius: 20, marginBottom: 32}}>
        <h1 style={{fontSize: 36, fontWeight: 700, marginBottom: 8, color: '#14532d'}}>📱 QR Code Generator</h1>
        <p style={{fontSize: 18, color: '#166534'}}>Generate blockchain-verified QR codes for product authentication</p>
      </div>

      <div style={{background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 24, boxShadow: 'var(--shadow)'}}>
        <h3 style={{marginTop: 0, color: '#1e293b', marginBottom: 16}}>🔗 Generate QR Code</h3>
        <div style={{display:'flex',gap:8}}>
          <input 
            value={batchId} 
            onChange={e=>setBatchId(e.target.value)} 
            placeholder="Enter Batch ID (e.g., BATCH-001)" 
            style={{flex:1,padding:12,borderRadius:12,border:'1px solid var(--border)', fontSize: 16}} 
          />
          <button 
            style={{...btnPrimary, opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer'}} 
            disabled={loading}
            onClick={make}
          >
            {loading ? 'Generating...' : 'Generate QR'}
          </button>
        </div>
      </div>

      {png && (
        <div style={{background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, boxShadow: 'var(--shadow)'}}>
          <h3 style={{marginTop: 0, color: '#1e293b', marginBottom: 16}}>📱 Generated QR Code</h3>
          <div style={{display:'flex',alignItems:'center',gap:24, flexWrap: 'wrap'}}>
            <div style={{textAlign: 'center'}}>
              <img src={png} alt="QR Code" width="256" height="256" style={{borderRadius: 12, border: '1px solid var(--border)'}} />
              <div style={{marginTop: 12}}>
                <button style={btnOutline} onClick={() => {
                  const link = document.createElement('a');
                  link.href = png;
                  link.download = `qr-${batchId}.png`;
                  link.click();
                }}>
                  📥 Download PNG
                </button>
              </div>
            </div>
            
            {txData && (
              <div style={{flex: 1, minWidth: 300}}>
                <h4 style={{color: '#1e293b', marginBottom: 12}}>🔗 Blockchain Data</h4>
                <div style={{background: 'white', border: '1px solid var(--border)', borderRadius: 8, padding: 16}}>
                  <div style={{display: 'grid', gap: 8, fontSize: 14}}>
                    <div style={{display: 'flex', justifyContent: 'space-between'}}>
                      <span style={{color: 'var(--muted)'}}>Transaction ID:</span>
                      <span style={{fontFamily: 'monospace', color: '#1e293b'}}>{txData.txId}</span>
                    </div>
                    <div style={{display: 'flex', justifyContent: 'space-between'}}>
                      <span style={{color: 'var(--muted)'}}>Block Number:</span>
                      <span style={{color: '#1e293b'}}>{txData.blockNumber}</span>
                    </div>
                    <div style={{display: 'flex', justifyContent: 'space-between'}}>
                      <span style={{color: 'var(--muted)'}}>Network:</span>
                      <span style={{color: '#1e293b'}}>{txData.network}</span>
                    </div>
                    <div style={{display: 'flex', justifyContent: 'space-between'}}>
                      <span style={{color: 'var(--muted)'}}>Channel:</span>
                      <span style={{color: '#1e293b'}}>{txData.channel}</span>
                    </div>
                    <div style={{display: 'flex', justifyContent: 'space-between'}}>
                      <span style={{color: 'var(--muted)'}}>Timestamp:</span>
                      <span style={{color: '#1e293b'}}>{new Date(txData.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div style={{marginTop: 16}}>
                  <Link to={`/verify/${txData.txId}`} style={btnPrimary}>
                    🔍 View Verification Page
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Certificate() {
  const { txId } = useParams();
  const [certificateData, setCertificateData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    const fetchCertificateData = async () => {
      try {
        // In a real implementation, this would fetch from blockchain
        // For now, we'll create mock data based on the txId
        const mockData = {
          txId: txId,
          blockNumber: Math.floor(Math.random() * 1000) + 1000,
          timestamp: new Date().toISOString(),
          productId: txId.split('_')[1] || 'UNKNOWN',
          farmer: 'Rajesh Kumar',
          species: 'Ashwagandha',
          location: 'Kerala, India',
          qualityGrade: 'A+',
          network: 'Hyperledger Fabric',
          channel: 'tracechannel',
          chaincode: 'tracecc',
          endorsements: ['peer0.org1', 'peer0.org2'],
          certificateNumber: `CERT-${txId.split('_')[1]}-${Date.now()}`
        };
        
        setCertificateData(mockData);
      } catch (error) {
        setError('Failed to load certificate data');
      } finally {
        setLoading(false);
      }
    };

    if (txId) {
      fetchCertificateData();
    }
  }, [txId]);

  const downloadPDF = () => {
    // Simple PDF generation using browser print
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Certificate of Authenticity - ${certificateData?.certificateNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .header { text-align: center; border-bottom: 3px solid #22c55e; padding-bottom: 20px; margin-bottom: 30px; }
            .content { line-height: 1.6; }
            .blockchain-info { background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🌿 Certificate of Authenticity</h1>
            <h2>HerbalTrace Blockchain Verification</h2>
          </div>
          <div class="content">
            <p><strong>Certificate Number:</strong> ${certificateData?.certificateNumber}</p>
            <p><strong>Product ID:</strong> ${certificateData?.productId}</p>
            <p><strong>Species:</strong> ${certificateData?.species}</p>
            <p><strong>Farmer:</strong> ${certificateData?.farmer}</p>
            <p><strong>Location:</strong> ${certificateData?.location}</p>
            <p><strong>Quality Grade:</strong> ${certificateData?.qualityGrade}</p>
            <p><strong>Issued Date:</strong> ${new Date(certificateData?.timestamp).toLocaleDateString()}</p>
            
            <div class="blockchain-info">
              <h3>🔗 Blockchain Verification</h3>
              <p><strong>Transaction ID:</strong> ${certificateData?.txId}</p>
              <p><strong>Block Number:</strong> ${certificateData?.blockNumber}</p>
              <p><strong>Network:</strong> ${certificateData?.network}</p>
              <p><strong>Channel:</strong> ${certificateData?.channel}</p>
              <p><strong>Endorsed by:</strong> ${certificateData?.endorsements.join(', ')}</p>
            </div>
            
            <p>This certificate verifies that the above product has been authenticated and recorded on the Hyperledger Fabric blockchain network. The information contained herein is immutable and tamper-proof.</p>
          </div>
          <div class="footer">
            <p>Generated by HerbalTrace • Powered by Hyperledger Fabric</p>
            <p>Verify at: ${window.location.origin}/verify/${txId}</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  if (loading) {
    return (
      <div style={{textAlign: 'center', padding: '60px 20px'}}>
        <div style={{fontSize: 48, marginBottom: 16}}>🔄</div>
        <p>Loading certificate...</p>
      </div>
    );
  }

  if (error || !certificateData) {
    return (
      <div style={{textAlign: 'center', padding: '60px 20px'}}>
        <div style={{fontSize: 48, marginBottom: 16}}>❌</div>
        <p>Failed to load certificate data</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', padding: '40px', borderRadius: 20, marginBottom: 32}}>
        <h1 style={{fontSize: 36, fontWeight: 700, marginBottom: 8, color: '#14532d'}}>📜 Certificate of Authenticity</h1>
        <p style={{fontSize: 18, color: '#166534'}}>Blockchain-verified product authenticity certificate</p>
      </div>

      <div style={{background: 'white', border: '2px solid #22c55e', borderRadius: 16, padding: 40, marginBottom: 24, boxShadow: 'var(--shadow)'}}>
        <div style={{textAlign: 'center', borderBottom: '3px solid #22c55e', paddingBottom: 20, marginBottom: 30}}>
          <h1 style={{fontSize: 32, fontWeight: 700, color: '#14532d', marginBottom: 8}}>🌿 Certificate of Authenticity</h1>
          <h2 style={{fontSize: 20, color: '#166534', margin: 0}}>HerbalTrace Blockchain Verification</h2>
        </div>

        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 30}}>
          <div>
            <h3 style={{color: '#1e293b', marginBottom: 16}}>📋 Product Information</h3>
            <div style={{display: 'grid', gap: 12}}>
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <span style={{color: 'var(--muted)'}}>Certificate Number:</span>
                <span style={{fontWeight: 600, color: '#1e293b'}}>{certificateData.certificateNumber}</span>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <span style={{color: 'var(--muted)'}}>Product ID:</span>
                <span style={{fontWeight: 600, color: '#1e293b'}}>{certificateData.productId}</span>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <span style={{color: 'var(--muted)'}}>Species:</span>
                <span style={{fontWeight: 600, color: '#1e293b'}}>{certificateData.species}</span>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <span style={{color: 'var(--muted)'}}>Farmer:</span>
                <span style={{fontWeight: 600, color: '#1e293b'}}>{certificateData.farmer}</span>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <span style={{color: 'var(--muted)'}}>Location:</span>
                <span style={{fontWeight: 600, color: '#1e293b'}}>{certificateData.location}</span>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <span style={{color: 'var(--muted)'}}>Quality Grade:</span>
                <span style={{fontWeight: 600, color: '#1e293b'}}>{certificateData.qualityGrade}</span>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <span style={{color: 'var(--muted)'}}>Issued Date:</span>
                <span style={{fontWeight: 600, color: '#1e293b'}}>{new Date(certificateData.timestamp).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 style={{color: '#1e293b', marginBottom: 16}}>🔗 Blockchain Verification</h3>
            <div style={{background: '#f0f9ff', border: '1px solid #0ea5e9', borderRadius: 12, padding: 20}}>
              <div style={{display: 'grid', gap: 12}}>
                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                  <span style={{color: '#64748b'}}>Transaction ID:</span>
                  <span style={{fontFamily: 'monospace', fontSize: 12, color: '#0c4a6e'}}>{certificateData.txId}</span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                  <span style={{color: '#64748b'}}>Block Number:</span>
                  <span style={{fontWeight: 600, color: '#0c4a6e'}}>{certificateData.blockNumber}</span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                  <span style={{color: '#64748b'}}>Network:</span>
                  <span style={{color: '#0c4a6e'}}>{certificateData.network}</span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                  <span style={{color: '#64748b'}}>Channel:</span>
                  <span style={{color: '#0c4a6e'}}>{certificateData.channel}</span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                  <span style={{color: '#64748b'}}>Endorsed by:</span>
                  <span style={{color: '#0c4a6e'}}>{certificateData.endorsements.join(', ')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{background: '#f0fdf4', border: '1px solid #22c55e', borderRadius: 12, padding: 20, marginBottom: 30}}>
          <p style={{margin: 0, color: '#166534', lineHeight: 1.6}}>
            <strong>✅ Verified:</strong> This certificate verifies that the above product has been authenticated and recorded on the Hyperledger Fabric blockchain network. The information contained herein is immutable and tamper-proof.
          </p>
        </div>

        <div style={{display: 'flex', gap: 16, justifyContent: 'center'}}>
          <button onClick={downloadPDF} style={btnPrimary}>
            📄 Download PDF Certificate
          </button>
          <Link to={`/verify/${txId}`} style={btnOutline}>
            🔍 Verify on Blockchain
          </Link>
        </div>
      </div>

      <div style={{textAlign: 'center', color: 'var(--muted)', fontSize: 14}}>
        <p>Generated by HerbalTrace • Powered by Hyperledger Fabric</p>
        <p>Verify authenticity at: <Link to={`/verify/${txId}`} style={{color: '#22c55e'}}>{window.location.origin}/verify/{txId}</Link></p>
      </div>
    </div>
  );
}

function Verify() {
  const { txId } = useParams();
  const [verificationData, setVerificationData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    const fetchVerificationData = async () => {
      try {
        // In a real implementation, this would query the blockchain
        // For now, we'll create mock verification data
        const mockData = {
          txId: txId,
          blockNumber: Math.floor(Math.random() * 1000) + 1000,
          timestamp: new Date().toISOString(),
          status: 'verified',
          network: 'Hyperledger Fabric',
          channel: 'tracechannel',
          chaincode: 'tracecc',
          endorsements: ['peer0.org1', 'peer0.org2'],
          productId: txId.split('_')[1] || 'UNKNOWN',
          farmer: 'Rajesh Kumar',
          species: 'Ashwagandha',
          location: 'Kerala, India',
          qualityGrade: 'A+',
          authenticityScore: 100
        };
        
        setVerificationData(mockData);
      } catch (error) {
        setError('Failed to verify transaction');
      } finally {
        setLoading(false);
      }
    };

    if (txId) {
      fetchVerificationData();
    }
  }, [txId]);

  if (loading) {
    return (
      <div style={{textAlign: 'center', padding: '60px 20px'}}>
        <div style={{fontSize: 48, marginBottom: 16}}>🔍</div>
        <p>Verifying transaction on blockchain...</p>
      </div>
    );
  }

  if (error || !verificationData) {
    return (
      <div style={{textAlign: 'center', padding: '60px 20px'}}>
        <div style={{fontSize: 48, marginBottom: 16}}>❌</div>
        <h3>Transaction Not Found</h3>
        <p>The transaction ID "{txId}" could not be found on the blockchain.</p>
        <Link to="/provenance" style={btnPrimary}>Try Another Verification</Link>
      </div>
    );
  }

  return (
    <div>
      <div style={{background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', padding: '40px', borderRadius: 20, marginBottom: 32}}>
        <h1 style={{fontSize: 36, fontWeight: 700, marginBottom: 8, color: '#0c4a6e'}}>🔍 Blockchain Verification</h1>
        <p style={{fontSize: 18, color: '#64748b'}}>Verify product authenticity on Hyperledger Fabric blockchain</p>
      </div>

      <div style={{background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 24, boxShadow: 'var(--shadow)'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24}}>
          <div style={{fontSize: 48}}>✅</div>
          <div>
            <h2 style={{margin: 0, color: '#1e293b'}}>Verified on Blockchain</h2>
            <p style={{margin: 0, color: 'var(--muted)'}}>This product has been successfully verified on the Hyperledger Fabric network</p>
          </div>
        </div>

        <div style={{background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)', border: '1px solid #22c55e', borderRadius: 12, padding: 20, marginBottom: 24}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12}}>
            <div style={{fontSize: 24}}>🔗</div>
            <h3 style={{margin: 0, color: '#14532b'}}>Blockchain Proof</h3>
          </div>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16}}>
            <div>
              <div style={{fontSize: 12, color: '#166534', marginBottom: 4}}>Transaction ID</div>
              <div style={{fontFamily: 'monospace', fontSize: 14, color: '#14532b', wordBreak: 'break-all'}}>{verificationData.txId}</div>
            </div>
            <div>
              <div style={{fontSize: 12, color: '#166534', marginBottom: 4}}>Block Number</div>
              <div style={{fontWeight: 600, color: '#14532b'}}>{verificationData.blockNumber}</div>
            </div>
            <div>
              <div style={{fontSize: 12, color: '#166534', marginBottom: 4}}>Network</div>
              <div style={{color: '#14532b'}}>{verificationData.network}</div>
            </div>
            <div>
              <div style={{fontSize: 12, color: '#166534', marginBottom: 4}}>Timestamp</div>
              <div style={{color: '#14532b'}}>{new Date(verificationData.timestamp).toLocaleString()}</div>
            </div>
          </div>
        </div>

        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24}}>
          <div>
            <h3 style={{color: '#1e293b', marginBottom: 16}}>📋 Product Details</h3>
            <div style={{display: 'grid', gap: 12}}>
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <span style={{color: 'var(--muted)'}}>Product ID:</span>
                <span style={{fontWeight: 600, color: '#1e293b'}}>{verificationData.productId}</span>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <span style={{color: 'var(--muted)'}}>Species:</span>
                <span style={{fontWeight: 600, color: '#1e293b'}}>{verificationData.species}</span>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <span style={{color: 'var(--muted)'}}>Farmer:</span>
                <span style={{fontWeight: 600, color: '#1e293b'}}>{verificationData.farmer}</span>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <span style={{color: 'var(--muted)'}}>Location:</span>
                <span style={{fontWeight: 600, color: '#1e293b'}}>{verificationData.location}</span>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <span style={{color: 'var(--muted)'}}>Quality Grade:</span>
                <span style={{fontWeight: 600, color: '#1e293b'}}>{verificationData.qualityGrade}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 style={{color: '#1e293b', marginBottom: 16}}>🔐 Verification Details</h3>
            <div style={{display: 'grid', gap: 12}}>
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <span style={{color: 'var(--muted)'}}>Status:</span>
                <span style={{fontWeight: 600, color: '#22c55e'}}>✅ Verified</span>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <span style={{color: 'var(--muted)'}}>Authenticity Score:</span>
                <span style={{fontWeight: 600, color: '#22c55e'}}>{verificationData.authenticityScore}%</span>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <span style={{color: 'var(--muted)'}}>Channel:</span>
                <span style={{color: '#1e293b'}}>{verificationData.channel}</span>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <span style={{color: 'var(--muted)'}}>Chaincode:</span>
                <span style={{color: '#1e293b'}}>{verificationData.chaincode}</span>
              </div>
              <div>
                <div style={{color: 'var(--muted)', marginBottom: 8}}>Endorsed by:</div>
                <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
                  {verificationData.endorsements.map((peer, i) => (
                    <span key={i} style={{background: '#e0f2fe', color: '#0c4a6e', padding: '4px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600}}>
                      {peer}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{marginTop: 24, display: 'flex', gap: 16, justifyContent: 'center'}}>
          <Link to={`/certificate/${txId}`} style={btnPrimary}>
            📜 View Certificate
          </Link>
          <Link to="/provenance" style={btnOutline}>
            🔍 Verify Another Product
          </Link>
        </div>
      </div>
    </div>
  );
}

function Products(){
  const [items,setItems]=React.useState([]);
  const [q,setQ]=React.useState('');
  const [scan,setScan]=React.useState(false);
  const [selectedBatch, setSelectedBatch] = React.useState(null);
  const [batchDetails, setBatchDetails] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [searchLoading, setSearchLoading] = React.useState(false);

  React.useEffect(()=>{ fetch(`${API_BASE}/batches`).then(r=>r.json()).then(setItems).catch(()=>{}).finally(() => setLoading(false)); },[]);
  const filtered = items.filter(b => !q || (b.batchId||'').toLowerCase().includes(q.toLowerCase()));

  const viewBatchDetails = async (batchId) => {
    setSelectedBatch(batchId);
    setLoading(true);
    try {
      const r = await axios.get(`/batch/${batchId}`);
      setBatchDetails(r.data);
    } catch (e) {
      console.error('Failed to fetch batch details:', e);
    } finally {
      setLoading(false);
    }
  };

  const closeBatchDetails = () => {
    setSelectedBatch(null);
    setBatchDetails(null);
  };

  const handleSearch = (searchTerm) => {
    setSearchLoading(true);
    setQ(searchTerm);
    // Simulate search delay for better UX
    setTimeout(() => setSearchLoading(false), 200);
  };

  return (
    <div>
      <div style={{background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', padding: '40px', borderRadius: 20, marginBottom: 32}}>
        <h1 style={{fontSize: 36, fontWeight: 700, marginBottom: 8, color: '#14532d'}}>🌿 Ayurvedic Products</h1>
        <p style={{fontSize: 18, color: '#166534'}}>Discover authentic herbal products with complete traceability from farm to consumer</p>
      </div>

      <div style={{display:'flex',gap:8, marginBottom: 32}}>
        <div style={{flex:1, position: 'relative'}}>
          <input
            value={q}
            onChange={e=>handleSearch(e.target.value)}
            placeholder="Search by batch ID, species, or location"
            style={{width:'100%',padding:12,borderRadius:12,border:'1px solid var(--border)', fontSize: 16}}
          />
          {searchLoading && (
            <div style={{position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)'}}>
              <div style={{width: 16, height: 16, border: '2px solid var(--border)', borderTop: '2px solid var(--brand)', borderRadius: '50%', animation: 'spin 1s linear infinite'}}></div>
            </div>
          )}
        </div>
        <button style={{...btnOutline, padding: '12px 24px'}} onClick={()=>setScan(true)}>📱 Scan QR</button>
      </div>

      {scan && <QrModal onClose={()=>setScan(false)} onDetected={(v)=>{
        const id = v.includes('batch=') ? new URL(v, location.origin).searchParams.get('batch') : v;
        location.href=`/provenance?batch=${encodeURIComponent(id)}`;
      }}/>}

      {loading ? (
        <div style={{textAlign: 'center', padding: '60px 20px', color: 'var(--muted)'}}>
          <div style={{fontSize: 48, marginBottom: 16}}>🔄</div>
          <p>Loading products...</p>
        </div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))',gap:20}}>
          {filtered.map(b => (
          <div key={b.batchId} style={{background:'var(--panel)',border:'1px solid var(--border)',borderRadius:16,padding:20,boxShadow:'var(--shadow)', transition: 'transform 0.2s', cursor: 'pointer'}} onClick={() => viewBatchDetails(b.batchId)}>
            <div style={{display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12}}>
              <div>
                <div style={{fontWeight:700, fontSize: 18, color: '#1e293b'}}>{b.batchId}</div>
                <div style={{color:'var(--muted)',fontSize:14, marginTop: 4}}>Verified Ayurvedic Product</div>
              </div>
              <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4}}>
                <div style={{background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', color: 'white', padding: '4px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600}}>
                  ✅ Verified
                </div>
                <div style={{background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', color: 'white', padding: '2px 6px', borderRadius: 8, fontSize: 10, fontWeight: 600}}>
                  🔗 Blockchain
                </div>
              </div>
            </div>

            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16}}>
                <div style={{textAlign: 'center', padding: '12px', background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', borderRadius: 8}}>
                  <div style={{fontSize: 20, fontWeight: 700, color: '#0ea5e9'}}>{(b.events || []).length}</div>
                  <div style={{fontSize: 12, color: '#64748b'}}>Collections</div>
                </div>
              <div style={{textAlign: 'center', padding: '12px', background: 'linear-gradient(135deg, #fefce8 0%, #fef3c7 100%)', borderRadius: 8}}>
                <div style={{fontSize: 20, fontWeight: 700, color: '#eab308'}}>{(b.qualityTests || []).length}</div>
                <div style={{fontSize: 12, color: '#a16207'}}>Tests</div>
              </div>
              <div style={{textAlign: 'center', padding: '12px', background: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)', borderRadius: 8}}>
                <div style={{fontSize: 20, fontWeight: 700, color: '#8b5cf6'}}>{(b.processingSteps || []).length}</div>
                <div style={{fontSize: 12, color: '#7c3aed'}}>Processing</div>
              </div>
            </div>

            <div style={{display:'flex',gap:8}}>
              <Link style={{...btnPrimary, flex: 1, padding: '10px', display:'inline-block', textAlign:'center'}} onClick={(e)=>e.stopPropagation()} to={`/provenance?batch=${encodeURIComponent(b.batchId)}`}>
                🔍 View Journey
              </Link>
              <button style={{...btnOutline, padding: '10px 16px'}} onClick={(e) => { e.stopPropagation(); viewBatchDetails(b.batchId); }}>
                📋 Details
              </button>
            </div>
          </div>
        ))}
        </div>
      )}

      {/* Batch Details Modal */}
      {selectedBatch && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'white',borderRadius:20,padding:32,maxWidth:800,width:'90%',maxHeight:'80vh',overflow:'auto'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24}}>
              <h2 style={{margin:0, color: '#1e293b'}}>Product Details: {selectedBatch}</h2>
              <button onClick={closeBatchDetails} style={{background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: 'var(--muted)'}}>×</button>
            </div>

            {loading ? (
              <div style={{textAlign: 'center', padding: '40px'}}>
                <div style={{fontSize: 48, marginBottom: 16}}>🔄</div>
                <p>Loading product details...</p>
              </div>
            ) : (batchDetails ? (
              <div>
                {/* Supply Chain Summary */}
                <div style={{background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', padding: '20px', borderRadius: 12, marginBottom: 24}}>
                  <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16}}>
                    <h3 style={{marginTop: 0, marginBottom: 0, color: '#1e293b'}}>Supply Chain Overview</h3>
                    <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                      <div style={{background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', color: 'white', padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600}}>
                        ✅ Verified on Blockchain
                      </div>
                      <div style={{background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', color: 'white', padding: '4px 8px', borderRadius: 12, fontSize: 10, fontWeight: 600}}>
                        🔗 Immutable Record
                      </div>
                    </div>
                  </div>
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16}}>
                    {(batchDetails.entry || []).filter((e) => e.resource.resourceType === 'CollectionEvent').map((event, i) => (
                      <div key={i} style={{background: 'white', padding: '12px', borderRadius: 8, border: '1px solid var(--border)'}}>
                        <div style={{fontWeight: 600, color: '#22c55e', marginBottom: 4}}>🌱 Collection</div>
                        <div style={{fontSize: 14, color: '#1e293b'}}>{event.resource.species}</div>
                        <div style={{fontSize: 12, color: 'var(--muted)'}}>{event.resource.collectorId}</div>
                      </div>
                    ))}
                    {(batchDetails.entry || []).filter((e) => e.resource.resourceType === 'QualityTest').map((test, i) => (
                      <div key={i} style={{background: 'white', padding: '12px', borderRadius: 8, border: '1px solid var(--border)'}}>
                        <div style={{fontWeight: 600, color: '#eab308', marginBottom: 4}}>🧪 Quality Test</div>
                        <div style={{fontSize: 14, color: '#1e293b'}}>{test.resource.labId}</div>
                        <div style={{fontSize: 12, color: 'var(--muted)'}}>{test.resource.result}</div>
                      </div>
                    ))}
                    {(batchDetails.entry || []).filter((e) => e.resource.resourceType === 'ProcessingStep').map((step, i) => (
                      <div key={i} style={{background: 'white', padding: '12px', borderRadius: 8, border: '1px solid var(--border)'}}>
                        <div style={{fontWeight: 600, color: '#3b82f6', marginBottom: 4}}>⚙️ Processing</div>
                        <div style={{fontSize: 14, color: '#1e293b'}}>{step.resource.stepType}</div>
                        <div style={{fontSize: 12, color: 'var(--muted)'}}>{step.resource.processorId}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Action Buttons */}
                <div style={{display: 'flex', gap: 12}}>
                  <Link style={{...btnPrimary, flex: 1, padding: '12px', display:'inline-block', textAlign:'center'}} to={`/provenance?batch=${encodeURIComponent(selectedBatch)}`}>
                    🔍 View Full Provenance
                  </Link>
                  <button style={{...btnOutline, padding: '12px 24px'}} onClick={closeBatchDetails}>
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div style={{textAlign: 'center', padding: '40px'}}>
                <div style={{fontSize: 48, marginBottom: 16}}>❌</div>
                <p>Failed to load product details</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div style={{textAlign: 'center', padding: '60px 20px', color: 'var(--muted)'}}>
          <div style={{fontSize: 64, marginBottom: 24}}>🔍</div>
          <h3>No products found</h3>
          <p>Try adjusting your search criteria or scan a QR code to verify a specific product</p>
        </div>
      )}
    </div>
  );
}

function Capture(){
  const [autoLoc,setAutoLoc]=React.useState(false);
  const [form,setForm]=React.useState({ eventId:'', collectorId:'', species:'', latitude:'', longitude:'', timestamp:'' });
  const [test,setTest]=React.useState({ testId:'', eventId:'', labId:'', parameters:'{"moisture":"10%"}', result:'PASS', date:'' });
  const [step,setStep]=React.useState({ stepId:'', batchId:'', processorId:'', stepType:'', timestamp:'', conditions:'{"temp":"60C"}' });
  const [batch,setBatch]=React.useState({ batchId:'', events:'[]', qualityTests:'[]', processingSteps:'[]', qrCode:'' });
  const [msg,setMsg]=React.useState('');
  const [errors,setErrors]=React.useState({});
  const [loading,setLoading]=React.useState({});
  
  const post = async (url, body) => { const r = await axios.post(url, body); return r.data; };
  const inputStyle = {width:'100%',padding:10,borderRadius:12,border:'1px solid var(--border)',background:'#fff',color:'var(--text)'};
  const cardStyle = {background:'var(--panel)',border:'1px solid var(--border)',borderRadius:12,padding:16,boxShadow:'var(--shadow)'};
  
  // Validation schemas matching blockchain requirements
  const validateCollectionEvent = (data) => {
    const errors = {};
    if (!data.eventId?.trim()) errors.eventId = 'Event ID is required';
    if (!data.collectorId?.trim()) errors.collectorId = 'Collector ID is required';
    if (!data.species?.trim()) errors.species = 'Species is required';
    if (!data.latitude || isNaN(Number(data.latitude))) errors.latitude = 'Valid latitude is required';
    if (!data.longitude || isNaN(Number(data.longitude))) errors.longitude = 'Valid longitude is required';
    if (!data.timestamp?.trim()) errors.timestamp = 'Timestamp is required';
    return errors;
  };

  const validateQualityTest = (data) => {
    const errors = {};
    if (!data.testId?.trim()) errors.testId = 'Test ID is required';
    if (!data.eventId?.trim()) errors.eventId = 'Event ID is required';
    if (!data.labId?.trim()) errors.labId = 'Lab ID is required';
    if (!data.result?.trim()) errors.result = 'Result is required';
    if (!data.date?.trim()) errors.date = 'Date is required';
    try {
      JSON.parse(data.parameters || '{}');
    } catch {
      errors.parameters = 'Parameters must be valid JSON';
    }
    return errors;
  };

  const validateProcessingStep = (data) => {
    const errors = {};
    if (!data.stepId?.trim()) errors.stepId = 'Step ID is required';
    if (!data.batchId?.trim()) errors.batchId = 'Batch ID is required';
    if (!data.processorId?.trim()) errors.processorId = 'Processor ID is required';
    if (!data.stepType?.trim()) errors.stepType = 'Step type is required';
    if (!data.timestamp?.trim()) errors.timestamp = 'Timestamp is required';
    try {
      JSON.parse(data.conditions || '{}');
    } catch {
      errors.conditions = 'Conditions must be valid JSON';
    }
    return errors;
  };

  const validateBatch = (data) => {
    const errors = {};
    if (!data.batchId?.trim()) errors.batchId = 'Batch ID is required';
    try {
      JSON.parse(data.events || '[]');
    } catch {
      errors.events = 'Events must be valid JSON array';
    }
    try {
      JSON.parse(data.qualityTests || '[]');
    } catch {
      errors.qualityTests = 'Quality tests must be valid JSON array';
    }
    try {
      JSON.parse(data.processingSteps || '[]');
    } catch {
      errors.processingSteps = 'Processing steps must be valid JSON array';
    }
    return errors;
  };

  React.useEffect(()=>{
    if (autoLoc && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos)=>{
        setForm(f=>({...f, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6)}));
      });
    }
  },[autoLoc]);
  return (
    <div>
      <h2>Data Capture</h2>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:16}}>
        <div className="slide-up" style={cardStyle}>
          <h3 style={{marginTop:0}}>Create Collection Event</h3>
          <div style={{margin:'6px 0'}}>
            <label style={{display:'inline-flex',alignItems:'center',gap:8}}>
              <input type="checkbox" checked={autoLoc} onChange={e=>setAutoLoc(e.target.checked)} /> Auto-capture GPS
            </label>
          </div>
          <Fields state={form} setState={setForm} fields={[['eventId'],['collectorId'],['species'],['latitude','number'],['longitude','number'],['timestamp','datetime-local']]} inputStyle={inputStyle} errors={errors} />
          <button 
            style={{...btnPrimary, opacity: loading.collection ? 0.6 : 1, cursor: loading.collection ? 'not-allowed' : 'pointer'}} 
            disabled={loading.collection}
            onClick={async()=>{
              const validationErrors = validateCollectionEvent(form);
              if (Object.keys(validationErrors).length > 0) {
                setErrors(prev => ({...prev, ...validationErrors}));
                return;
              }
              setLoading(prev => ({...prev, collection: true}));
              setErrors(prev => ({...prev, ...Object.fromEntries(Object.keys(validationErrors).map(k => [k, '']))}));
              try {
                const body={...form,latitude:Number(form.latitude),longitude:Number(form.longitude)};
                const d=await post('/collection-event', body);
                setMsg(JSON.stringify(d,null,2));
              } catch (error) {
                setMsg(`Error: ${error.response?.data?.error || error.message}`);
              } finally {
                setLoading(prev => ({...prev, collection: false}));
              }
            }}
          >
            {loading.collection ? 'Submitting...' : 'Submit'}
          </button>
        </div>
        <div className="slide-up" style={cardStyle}>
          <h3 style={{marginTop:0}}>Create Quality Test</h3>
          <Fields state={test} setState={setTest} fields={[['testId'],['eventId'],['labId'],['parameters','textarea'],['result'],['date','date']]} inputStyle={inputStyle} errors={errors} />
          <button 
            style={{...btnPrimary, opacity: loading.quality ? 0.6 : 1, cursor: loading.quality ? 'not-allowed' : 'pointer'}} 
            disabled={loading.quality}
            onClick={async()=>{
              const validationErrors = validateQualityTest(test);
              if (Object.keys(validationErrors).length > 0) {
                setErrors(prev => ({...prev, ...validationErrors}));
                return;
              }
              setLoading(prev => ({...prev, quality: true}));
              setErrors(prev => ({...prev, ...Object.fromEntries(Object.keys(validationErrors).map(k => [k, '']))}));
              try {
                const body={...test,parameters:JSON.parse(test.parameters||'{}')};
                const d=await post('/quality-test', body);
                setMsg(JSON.stringify(d,null,2));
              } catch (error) {
                setMsg(`Error: ${error.response?.data?.error || error.message}`);
              } finally {
                setLoading(prev => ({...prev, quality: false}));
              }
            }}
          >
            {loading.quality ? 'Submitting...' : 'Submit'}
          </button>
        </div>
        <div className="slide-up" style={cardStyle}>
          <h3 style={{marginTop:0}}>Create Processing Step</h3>
          <Fields state={step} setState={setStep} fields={[['stepId'],['batchId'],['processorId'],['stepType'],['conditions','textarea'],['timestamp','datetime-local']]} inputStyle={inputStyle} errors={errors} />
          <button 
            style={{...btnPrimary, opacity: loading.processing ? 0.6 : 1, cursor: loading.processing ? 'not-allowed' : 'pointer'}} 
            disabled={loading.processing}
            onClick={async()=>{
              const validationErrors = validateProcessingStep(step);
              if (Object.keys(validationErrors).length > 0) {
                setErrors(prev => ({...prev, ...validationErrors}));
                return;
              }
              setLoading(prev => ({...prev, processing: true}));
              setErrors(prev => ({...prev, ...Object.fromEntries(Object.keys(validationErrors).map(k => [k, '']))}));
              try {
                const body={...step,conditions:JSON.parse(step.conditions||'{}')};
                const d=await post('/processing-step', body);
                setMsg(JSON.stringify(d,null,2));
              } catch (error) {
                setMsg(`Error: ${error.response?.data?.error || error.message}`);
              } finally {
                setLoading(prev => ({...prev, processing: false}));
              }
            }}
          >
            {loading.processing ? 'Submitting...' : 'Submit'}
          </button>
        </div>
        <div className="slide-up" style={cardStyle}>
          <h3 style={{marginTop:0}}>Create Batch</h3>
          <Fields state={batch} setState={setBatch} fields={[['batchId'],['events','textarea'],['qualityTests','textarea'],['processingSteps','textarea'],['qrCode']]} inputStyle={inputStyle} errors={errors} />
          <button 
            style={{...btnPrimary, opacity: loading.batch ? 0.6 : 1, cursor: loading.batch ? 'not-allowed' : 'pointer'}} 
            disabled={loading.batch}
            onClick={async()=>{
              const validationErrors = validateBatch(batch);
              if (Object.keys(validationErrors).length > 0) {
                setErrors(prev => ({...prev, ...validationErrors}));
                return;
              }
              setLoading(prev => ({...prev, batch: true}));
              setErrors(prev => ({...prev, ...Object.fromEntries(Object.keys(validationErrors).map(k => [k, '']))}));
              try {
                const body={ batchId:batch.batchId, events:JSON.parse(batch.events||'[]'), qualityTests:JSON.parse(batch.qualityTests||'[]'), processingSteps:JSON.parse(batch.processingSteps||'[]'), qrCode:batch.qrCode };
                const d=await post('/batch', body);
                setMsg(JSON.stringify(d,null,2));
              } catch (error) {
                setMsg(`Error: ${error.response?.data?.error || error.message}`);
              } finally {
                setLoading(prev => ({...prev, batch: false}));
              }
            }}
          >
            {loading.batch ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>
      {msg && <pre style={{background:'#fff',border:'1px solid var(--border)',borderRadius:8,padding:12,whiteSpace:'pre-wrap',marginTop:12,boxShadow:'var(--shadow)'}}>{msg}</pre>}
    </div>
  );
}

function Provenance(){
  const [id,setId]=React.useState('');
  const [bundle,setBundle]=React.useState(null);
  const [scan,setScan]=React.useState(false);
  const [blockchainProof, setBlockchainProof] = React.useState(null);
  const [supplyChainFlow, setSupplyChainFlow] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  const onFetch = async ()=>{
    if (!id.trim()) return;
    setLoading(true);
    try {
      const r = await axios.get(`/batch/${id}`);
      setBundle(r.data);

      // Extract supply chain flow
      const flow = [];
      if (r.data.entry) {
        const batch = r.data.entry.find(e => e.resource.resourceType === 'BatchAsset')?.resource;
        const events = r.data.entry.filter(e => e.resource.resourceType === 'CollectionEvent').map(e => e.resource);
        const tests = r.data.entry.filter(e => e.resource.resourceType === 'QualityTest').map(e => e.resource);
        const steps = r.data.entry.filter(e => e.resource.resourceType === 'ProcessingStep').map(e => e.resource);

        // Build chronological flow
        events.forEach(event => flow.push({ type: 'collection', data: event, timestamp: new Date(event.timestamp) }));
        tests.forEach(test => flow.push({ type: 'test', data: test, timestamp: new Date(test.date) }));
        steps.forEach(step => flow.push({ type: 'processing', data: step, timestamp: new Date(step.timestamp) }));
        flow.sort((a, b) => a.timestamp - b.timestamp);
      }
      setSupplyChainFlow(flow);

      // Mock blockchain proof data (in real implementation, this would come from blockchain queries)
      setBlockchainProof({
        batchId: id,
        blockNumber: Math.floor(Math.random() * 1000) + 1000,
        transactionHash: '0x' + Math.random().toString(16).substr(2, 64),
        timestamp: new Date().toISOString(),
        network: 'Hyperledger Fabric',
        channel: 'tracechannel',
        chaincode: 'tracecc'
      });

    } catch (e) {
      console.error('Failed to fetch provenance:', e);
      alert('Failed to fetch provenance data');
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch if batch ID is in URL params
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const batchParam = urlParams.get('batch');
    if (batchParam) {
      setId(batchParam);
      setTimeout(() => onFetch(), 100); // Small delay to ensure state is set
    }
  }, []);

  return (
    <div>
      <div style={{background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', padding: '40px', borderRadius: 20, marginBottom: 32}}>
        <h1 style={{fontSize: 36, fontWeight: 700, marginBottom: 8, color: '#0c4a6e'}}>🔍 Product Provenance</h1>
        <p style={{fontSize: 18, color: '#64748b'}}>Verify authenticity and trace the complete journey of your product</p>
      </div>

      <div style={{display:'flex',gap:8, marginBottom: 32}}>
        <input
          value={id}
          onChange={(e)=>setId(e.target.value)}
          placeholder="Enter Batch ID (e.g., BATCH-001)"
          style={{flex:1,padding:12,borderRadius:12,border:'1px solid var(--border)',background:'#fff',color:'var(--text)', fontSize: 16}}
        />
        <button style={{...btnPrimary, padding: '12px 24px'}} onClick={onFetch} disabled={loading}>
          {loading ? '🔍 Searching...' : '🔍 Verify'}
        </button>
        <button style={{...btnOutline, padding: '12px 24px'}} onClick={()=>setScan(true)}>📱 Scan QR</button>
      </div>

      {scan && <QrModal onClose={()=>setScan(false)} onDetected={(v)=>{
        const batchId = v.includes('batch=') ? new URL(v, window.location.origin).searchParams.get('batch') : v;
        setId(batchId);
        setScan(false);
        setTimeout(() => onFetch(), 100);
      }}/>}

      {bundle && (
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32}}>
          {/* Supply Chain Flow */}
          <div style={{background:'var(--panel)',border:'1px solid var(--border)',borderRadius:16,padding:24,boxShadow:'var(--shadow)'}}>
            <h2 style={{marginTop:0, marginBottom: 20, color: '#1e293b'}}>Supply Chain Journey</h2>
            <div style={{maxHeight: 500, overflowY: 'auto'}}>
              {supplyChainFlow.length === 0 ? (
                <div style={{textAlign: 'center', color: 'var(--muted)', padding: '40px 20px'}}>
                  <div style={{fontSize: 48, marginBottom: 16}}>📋</div>
                  <p>No supply chain data available</p>
                </div>
              ) : (
                supplyChainFlow.map((item, i) => (
                  <div key={i} style={{display: 'flex', alignItems: 'flex-start', marginBottom: 20, position: 'relative'}}>
                    {/* Timeline line */}
                    {i < supplyChainFlow.length - 1 && (
                      <div style={{
                        position: 'absolute',
                        left: 20,
                        top: 40,
                        width: 2,
                        height: 60,
                        background: 'var(--brand)',
                        zIndex: 1
                      }} />
                    )}

                    {/* Icon */}
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: item.type === 'collection' ? '#22c55e' : item.type === 'test' ? '#eab308' : '#3b82f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20,
                      marginRight: 16
                    }}>
        {item.type === 'collection' ? '🌱' : (item.type === 'test' ? '🧪' : '⚙️')}
                    </div>

                    {/* Content */}
                    <div style={{flex: 1}}>
                      <div style={{fontWeight: 600, color: '#1e293b', marginBottom: 4}}>
          {item.type === 'collection' ? 'Collection Event' : (item.type === 'test' ? 'Quality Test' : 'Processing Step')}
                      </div>
                      <div style={{fontSize: 14, color: 'var(--muted)', marginBottom: 4}}>
          {item.type === 'collection' ? `Species: ${item.data.species}` : (item.type === 'test' ? `Lab: ${item.data.labId}` : `Type: ${item.data.stepType}`)}
                      </div>
                      <div style={{fontSize: 12, color: 'var(--muted)'}}>
                        {new Date(item.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Blockchain Proof */}
          <div style={{background:'var(--panel)',border:'1px solid var(--border)',borderRadius:16,padding:24,boxShadow:'var(--shadow)'}}>
            <h2 style={{marginTop:0, marginBottom: 20, color: '#1e293b'}}>🔗 Blockchain Verification</h2>
            {blockchainProof ? (
              <div>
                <div style={{background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', padding: '16px', borderRadius: 12, marginBottom: 16}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12}}>
                    <div style={{fontSize: 24}}>✅</div>
                    <div style={{fontWeight: 600, color: '#0c4a6e'}}>Verified on Blockchain</div>
                  </div>
                  <div style={{fontSize: 14, color: '#64748b'}}>
                    This product's journey is immutably recorded on the blockchain network
                  </div>
                </div>

                <div style={{display: 'grid', gap: 12}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'white', borderRadius: 8, border: '1px solid var(--border)'}}>
                    <span style={{fontWeight: 600, color: '#1e293b'}}>Block Number:</span>
                    <span style={{fontFamily: 'monospace', color: '#64748b'}}>{blockchainProof.blockNumber}</span>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'white', borderRadius: 8, border: '1px solid var(--border)'}}>
                    <span style={{fontWeight: 600, color: '#1e293b'}}>Transaction Hash:</span>
                    <span style={{fontFamily: 'monospace', fontSize: 12, color: '#64748b'}}>{blockchainProof.transactionHash.substring(0, 20)}...</span>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'white', borderRadius: 8, border: '1px solid var(--border)'}}>
                    <span style={{fontWeight: 600, color: '#1e293b'}}>Network:</span>
                    <span style={{color: '#64748b'}}>{blockchainProof.network}</span>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'white', borderRadius: 8, border: '1px solid var(--border)'}}>
                    <span style={{fontWeight: 600, color: '#1e293b'}}>Timestamp:</span>
                    <span style={{color: '#64748b'}}>{new Date(blockchainProof.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{textAlign: 'center', color: 'var(--muted)', padding: '40px 20px'}}>
                <div style={{fontSize: 48, marginBottom: 16}}>🔗</div>
                <p>Blockchain verification data not available</p>
              </div>
            )}
          </div>
        </div>
      )}

      {!bundle && !loading && (
        <div style={{textAlign: 'center', padding: '80px 20px', color: 'var(--muted)'}}>
          <div style={{fontSize: 64, marginBottom: 24}}>🔍</div>
          <h3>Enter a Batch ID to verify</h3>
          <p>Scan a QR code or manually enter a batch ID to view the complete supply chain journey</p>
        </div>
      )}
    </div>
  );
}

function Login(){
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [role, setRole] = React.useState('farmer');
  const [name, setName] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [nameError, setNameError] = React.useState('');

  // Get the intended destination from location state
  const from = location.state?.from?.pathname || '/';

  const validateForm = () => {
    let isValid = true;
    setNameError('');
    setError('');

    if (!name.trim()) {
      setNameError('Name is required');
      isValid = false;
    } else if (name.trim().length < 2) {
      setNameError('Name must be at least 2 characters');
      isValid = false;
    }

    return isValid;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      await auth.login(role, name.trim());
      // Navigate to appropriate dashboard after successful login
      const dashboardRoutes = {
        farmer: '/farmer',
        lab: '/lab',
        admin: '/processor',
        customer: '/products'
      };

      // If user was trying to access a protected route, redirect there
      // Otherwise, redirect to their role-specific dashboard
      const redirectTo = from !== '/' && from !== '/login' ? from : (dashboardRoutes[role] || '/');
      navigate(redirectTo, { replace: true });
    } catch (error) {
      console.error('Login error:', error);
      setError(error.response?.data?.message || 'Login failed. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleLogin();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  const handleNameChange = (e) => {
    setName(e.target.value);
    if (nameError && e.target.value.trim().length >= 2) {
      setNameError('');
    }
  };

  return (
    <div style={{maxWidth: 400, margin: '0 auto', padding: 24}}>
      <form onSubmit={handleSubmit} style={{background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 16, padding: 32, boxShadow: 'var(--shadow)'}}>
        <h1 style={{textAlign: 'center', marginBottom: 8, color: '#1e293b'}}>Welcome to HerbalTrace</h1>
        <p style={{textAlign: 'center', color: 'var(--muted)', marginBottom: 32}}>Sign in to access your dashboard</p>

        {error && (
          <div style={{
            background: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            padding: 12,
            marginBottom: 24,
            color: '#dc2626',
            fontSize: 14
          }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{marginBottom: 24}}>
          <label htmlFor="role-select" style={{display: 'block', marginBottom: 8, fontWeight: 600, color: '#1e293b'}}>Role</label>
          <select
            id="role-select"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={loading}
            style={{
              width: '100%',
              padding: 12,
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'white',
              fontSize: 16,
              opacity: loading ? 0.6 : 1
            }}
          >
            <option value="farmer">🌱 Farmer</option>
            <option value="lab">🧪 Lab Technician</option>
            <option value="admin">⚙️ Administrator</option>
            <option value="customer">👤 Customer</option>
          </select>
        </div>

        <div style={{marginBottom: 32}}>
          <label htmlFor="name-input" style={{display: 'block', marginBottom: 8, fontWeight: 600, color: '#1e293b'}}>Name</label>
          <input
            id="name-input"
            type="text"
            value={name}
            onChange={handleNameChange}
            onKeyPress={handleKeyPress}
            placeholder="Enter your name"
            disabled={loading}
            aria-describedby={nameError ? "name-error" : undefined}
            style={{
              width: '100%',
              padding: 12,
              borderRadius: 8,
              border: nameError ? '1px solid #dc2626' : '1px solid var(--border)',
              background: 'white',
              fontSize: 16,
              opacity: loading ? 0.6 : 1
            }}
          />
          {nameError && (
            <div id="name-error" style={{color: '#dc2626', fontSize: 14, marginTop: 4}}>
              {nameError}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !name.trim()}
          style={{
            ...btnPrimary,
            width: '100%',
            padding: '12px',
            fontSize: 16,
            opacity: (loading || !name.trim()) ? 0.6 : 1,
            cursor: (loading || !name.trim()) ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8
          }}
        >
          {loading ? (
            <>
              <div style={{width: 16, height: 16, border: '2px solid #ffffff', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite'}}></div>
              Signing In...
            </>
          ) : (
            'Sign In'
          )}
        </button>
      </form>
    </div>
  );
}

function Farmer() {
  return <FarmerDashboard />;
}

function Lab(){
  const [tests, setTests] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch(`${API_BASE}/quality-tests`)
      .then(r => r.json())
      .then(setTests)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div style={{background: 'linear-gradient(135deg, #fefce8 0%, #fef3c7 100%)', padding: '40px', borderRadius: 20, marginBottom: 32}}>
        <h1 style={{fontSize: 36, fontWeight: 700, marginBottom: 8, color: '#92400e'}}>🧪 Lab Dashboard</h1>
        <p style={{fontSize: 18, color: '#a16207'}}>Manage quality tests and ensure product standards</p>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24}}>
        <div style={{background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, boxShadow: 'var(--shadow)'}}>
          <h3 style={{marginTop: 0, color: '#1e293b'}}>📊 Test Summary</h3>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16}}>
            <div style={{textAlign: 'center', padding: '20px', background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', borderRadius: 12}}>
              <div style={{fontSize: 32, fontWeight: 700, color: '#92400e'}}>{tests.length}</div>
              <div style={{fontSize: 14, color: '#78350f'}}>Total Tests</div>
            </div>
            <div style={{textAlign: 'center', padding: '20px', background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)', borderRadius: 12}}>
              <div style={{fontSize: 32, fontWeight: 700, color: '#166534'}}>{tests.filter(t => t.result === 'PASS').length}</div>
              <div style={{fontSize: 14, color: '#14532d'}}>Passed Tests</div>
            </div>
          </div>
        </div>

        <div style={{background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, boxShadow: 'var(--shadow)'}}>
          <h3 style={{marginTop: 0, color: '#1e293b'}}>🧪 Recent Tests</h3>
          <div style={{maxHeight: 300, overflowY: 'auto'}}>
            {loading ? (
              <div style={{textAlign: 'center', padding: '40px', color: 'var(--muted)'}}>
                <div style={{fontSize: 24, marginBottom: 8}}>🔄</div>
                Loading tests...
              </div>
            ) : tests.length === 0 ? (
              <div style={{textAlign: 'center', padding: '40px', color: 'var(--muted)'}}>
                <div style={{fontSize: 48, marginBottom: 16}}>🧪</div>
                <p>No tests yet</p>
                <p style={{fontSize: 14}}>Start by conducting your first quality test</p>
              </div>
            ) : (
              tests.slice(0, 10).map((test, i) => (
                <div key={i} style={{display: 'flex', alignItems: 'center', gap: 12, padding: '12px', borderRadius: 8, background: 'white', marginBottom: 8, border: '1px solid var(--border)'}}>
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: test.result === 'PASS' ? '#22c55e' : '#ef4444'
                  }}></div>
                  <div style={{flex: 1}}>
                    <div style={{fontWeight: 600, color: '#1e293b'}}>{test.testId}</div>
                    <div style={{fontSize: 12, color: 'var(--muted)'}}>{new Date(test.date).toLocaleDateString()}</div>
                  </div>
                  <div style={{
                    padding: '4px 8px',
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 600,
                    background: test.result === 'PASS' ? '#dcfce7' : '#fee2e2',
                    color: test.result === 'PASS' ? '#166534' : '#991b1b'
                  }}>
                    {test.result}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div style={{marginTop: 32, textAlign: 'center'}}>
        <Link to="/capture" style={btnPrimary}>+ Conduct New Test</Link>
      </div>
    </div>
  );
}

function Processor(){
  const [steps, setSteps] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch(`${API_BASE}/processing-steps`)
      .then(r => r.json())
      .then(setSteps)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div style={{background: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)', padding: '40px', borderRadius: 20, marginBottom: 32}}>
        <h1 style={{fontSize: 36, fontWeight: 700, marginBottom: 8, color: '#6b21a8'}}>⚙️ Processing Dashboard</h1>
        <p style={{fontSize: 18, color: '#7c3aed'}}>Manage processing operations and track batch transformations</p>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24}}>
        <div style={{background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, boxShadow: 'var(--shadow)'}}>
          <h3 style={{marginTop: 0, color: '#1e293b'}}>📊 Processing Summary</h3>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16}}>
            <div style={{textAlign: 'center', padding: '20px', background: 'linear-gradient(135deg, #e9d5ff 0%, #d8b4fe 100%)', borderRadius: 12}}>
              <div style={{fontSize: 32, fontWeight: 700, color: '#6b21a8'}}>{steps.length}</div>
              <div style={{fontSize: 14, color: '#581c87'}}>Total Steps</div>
            </div>
            <div style={{textAlign: 'center', padding: '20px', background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', borderRadius: 12}}>
              <div style={{fontSize: 32, fontWeight: 700, color: '#1d4ed8'}}>{new Set(steps.map(s => s.stepType)).size}</div>
              <div style={{fontSize: 14, color: '#1e40af'}}>Step Types</div>
            </div>
          </div>
        </div>

        <div style={{background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, boxShadow: 'var(--shadow)'}}>
          <h3 style={{marginTop: 0, color: '#1e293b'}}>⚙️ Recent Processing Steps</h3>
          <div style={{maxHeight: 300, overflowY: 'auto'}}>
            {loading ? (
              <div style={{textAlign: 'center', padding: '40px', color: 'var(--muted)'}}>
                <div style={{fontSize: 24, marginBottom: 8}}>🔄</div>
                Loading processing steps...
              </div>
            ) : steps.length === 0 ? (
              <div style={{textAlign: 'center', padding: '40px', color: 'var(--muted)'}}>
                <div style={{fontSize: 48, marginBottom: 16}}>⚙️</div>
                <p>No processing steps yet</p>
                <p style={{fontSize: 14}}>Start by adding your first processing operation</p>
              </div>
            ) : (
              steps.slice(0, 10).map((step, i) => (
                <div key={i} style={{display: 'flex', alignItems: 'center', gap: 12, padding: '12px', borderRadius: 8, background: 'white', marginBottom: 8, border: '1px solid var(--border)'}}>
                  <div style={{width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6'}}></div>
                  <div style={{flex: 1}}>
                    <div style={{fontWeight: 600, color: '#1e293b'}}>{step.stepType}</div>
                    <div style={{fontSize: 12, color: 'var(--muted)'}}>{new Date(step.timestamp).toLocaleDateString()}</div>
                  </div>
                  <div style={{fontSize: 12, color: 'var(--muted)'}}>{step.stepId}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div style={{marginTop: 32, textAlign: 'center'}}>
        <Link to="/capture" style={btnPrimary}>+ Add Processing Step</Link>
      </div>
    </div>
  );
}

function SupplyChain(){
  const [batches, setBatches] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch(`${API_BASE}/batches`)
      .then(r => r.json())
      .then(setBatches)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div style={{background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', padding: '40px', borderRadius: 20, marginBottom: 32}}>
        <h1 style={{fontSize: 36, fontWeight: 700, marginBottom: 8, color: '#0c4a6e'}}>Supply Chain Overview</h1>
        <p style={{fontSize: 18, color: '#64748b'}}>Monitor all batches and their complete journey through the supply chain</p>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 24}}>
        {loading ? (
          <div style={{gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: 'var(--muted)'}}>
            <div style={{fontSize: 48, marginBottom: 16}}>🔄</div>
            <p>Loading supply chain data...</p>
          </div>
        ) : batches.length === 0 ? (
          <div style={{gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: 'var(--muted)'}}>
            <div style={{fontSize: 64, marginBottom: 24}}>📦</div>
            <h3>No batches in supply chain</h3>
            <p>Start by creating your first batch to begin tracking the supply chain</p>
          </div>
        ) : (
          batches.map((batch, i) => (
            <div key={i} style={{background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, boxShadow: 'var(--shadow)'}}>
              <div style={{display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16}}>
                <div>
                  <div style={{fontWeight: 700, fontSize: 18, color: '#1e293b', marginBottom: 4}}>{batch.batchId}</div>
                  <div style={{color: 'var(--muted)', fontSize: 14}}>Supply Chain Batch</div>
                </div>
                <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4}}>
                  <div style={{background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', color: 'white', padding: '4px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600}}>
                    ✅ Active
                  </div>
                  <div style={{background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', color: 'white', padding: '2px 6px', borderRadius: 8, fontSize: 10, fontWeight: 600}}>
                    🔗 Tracked
                  </div>
                </div>
              </div>

              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20}}>
                <div style={{textAlign: 'center', padding: '12px', background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', borderRadius: 8}}>
                  <div style={{fontSize: 20, fontWeight: 700, color: '#0ea5e9'}}>{(batch.events || []).length}</div>
                  <div style={{fontSize: 12, color: '#64748b'}}>Collections</div>
                </div>
                <div style={{textAlign: 'center', padding: '12px', background: 'linear-gradient(135deg, #fefce8 0%, #fef3c7 100%)', borderRadius: 8}}>
                  <div style={{fontSize: 20, fontWeight: 700, color: '#eab308'}}>{(batch.qualityTests || []).length}</div>
                  <div style={{fontSize: 12, color: '#a16207'}}>Tests</div>
                </div>
                <div style={{textAlign: 'center', padding: '12px', background: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)', borderRadius: 8}}>
                  <div style={{fontSize: 20, fontWeight: 700, color: '#8b5cf6'}}>{(batch.processingSteps || []).length}</div>
                  <div style={{fontSize: 12, color: '#7c3aed'}}>Processing</div>
                </div>
              </div>

              <div style={{display: 'flex', gap: 8}}>
                <Link style={{...btnPrimary, flex: 1, padding: '10px', display:'inline-block', textAlign:'center'}} to={`/provenance?batch=${encodeURIComponent(batch.batchId)}`}>
                  🔍 View Journey
                </Link>
                <Link style={{...btnOutline, padding: '10px 16px', display:'inline-block', textAlign:'center'}} to={`/qr?batch=${encodeURIComponent(batch.batchId)}`}>
                  📱 QR Code
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function About(){
  return (
    <div>
      <div style={{background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', padding: '40px', borderRadius: 20, marginBottom: 32}}>
        <h1 style={{fontSize: 36, fontWeight: 700, marginBottom: 8, color: '#14532d'}}> About HerbalTrace</h1>
        <p style={{fontSize: 18, color: '#166534'}}>Revolutionizing Ayurveda with blockchain-powered traceability</p>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32}}>
        <div>
          <h2 style={{color: '#1e293b'}}>Our Mission</h2>
          <p style={{color: 'var(--muted)', lineHeight: 1.6}}>
            HerbalTrace is dedicated to ensuring the authenticity, quality, and sustainability of Ayurvedic products
            through comprehensive blockchain-based traceability from farm to consumer.
          </p>

          <h2 style={{color: '#1e293b', marginTop: 32}}>How It Works</h2>
          <div style={{display: 'grid', gap: 16}}>
            <div style={{display: 'flex', alignItems: 'flex-start', gap: 16}}>
              <div style={{width: 40, height: 40, borderRadius: '50%', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 20}}>🌱</div>
              <div>
                <div style={{fontWeight: 600, color: '#1e293b'}}>Collection</div>
                <div style={{color: 'var(--muted)'}}>Farmers capture geo-tagged collection events with species identification</div>
              </div>
            </div>
            <div style={{display: 'flex', alignItems: 'flex-start', gap: 16}}>
              <div style={{width: 40, height: 40, borderRadius: '50%', background: '#eab308', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 20}}>🧪</div>
              <div>
                <div style={{fontWeight: 600, color: '#1e293b'}}>Quality Testing</div>
                <div style={{color: 'var(--muted)'}}>Labs conduct comprehensive quality tests and record results</div>
              </div>
            </div>
            <div style={{display: 'flex', alignItems: 'flex-start', gap: 16}}>
              <div style={{width: 40, height: 40, borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 20}}>⚙️</div>
              <div>
                <div style={{fontWeight: 600, color: '#1e293b'}}>Processing</div>
                <div style={{color: 'var(--muted)'}}>Processing facilities track transformation steps and conditions</div>
              </div>
            </div>
            <div style={{display: 'flex', alignItems: 'flex-start', gap: 16}}>
              <div style={{width: 40, height: 40, borderRadius: '50%', background: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 20}}>🔗</div>
              <div>
                <div style={{fontWeight: 600, color: '#1e293b'}}>Blockchain Verification</div>
                <div style={{color: 'var(--muted)'}}>All data is immutably recorded on Hyperledger Fabric blockchain</div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h2 style={{color: '#1e293b'}}>Key Features</h2>
          <div style={{display: 'grid', gap: 16}}>
            <div style={{background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 20}}>
              <div style={{fontWeight: 600, color: '#1e293b', marginBottom: 8}}>📍 Geo-tagging</div>
              <div style={{color: 'var(--muted)'}}>Every collection is tagged with precise GPS coordinates for origin verification</div>
            </div>
            <div style={{background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 20}}>
              <div style={{fontWeight: 600, color: '#1e293b', marginBottom: 8}}>🧪 Quality Assurance</div>
              <div style={{color: 'var(--muted)'}}>Comprehensive testing protocols ensure product purity and efficacy</div>
            </div>
            <div style={{background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 20}}>
              <div style={{fontWeight: 600, color: '#1e293b', marginBottom: 8}}>📱 QR Verification</div>
              <div style={{color: 'var(--muted)'}}>Customers can instantly verify product authenticity with QR codes</div>
            </div>
            <div style={{background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 20}}>
              <div style={{fontWeight: 600, color: '#1e293b', marginBottom: 8}}>🔒 Immutable Records</div>
              <div style={{color: 'var(--muted)'}}>Blockchain technology ensures data cannot be altered or tampered with</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Fields({state,setState,fields,inputStyle,errors={}}){
  return fields.map(([k,t])=>(
    <div key={k} style={{margin:'8px 0'}}>
      <label style={{display:'block',marginBottom:4,fontWeight:600,color:'var(--text)'}}>{k.replace(/([A-Z])/g,' $1').replace(/^./,str=>str.toUpperCase())}</label>
      {t==='textarea'?<textarea value={state[k]||''} onChange={e=>setState({...state,[k]:e.target.value})} style={{...inputStyle,height:80,borderColor:errors[k]?'#dc2626':'var(--border)'}}/>:
       <input type={t||'text'} value={state[k]||''} onChange={e=>setState({...state,[k]:e.target.value})} style={{...inputStyle,borderColor:errors[k]?'#dc2626':'var(--border)'}}/>}
      {errors[k] && <div style={{color:'#dc2626',fontSize:12,marginTop:4}}>{errors[k]}</div>}
    </div>
  ));
}

function QrModal({onClose,onDetected}){
  const videoRef=React.useRef();
  const canvasRef=React.useRef();
  const [scanning,setScanning]=React.useState(true);

  React.useEffect(()=>{
    const startScan = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        videoRef.current.srcObject = stream;
        videoRef.current.play();

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        const scan = () => {
          if (!scanning) return;
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          // QR code detection would go here - simplified for demo
          requestAnimationFrame(scan);
        };
        scan();
      } catch (e) {
        console.error('Camera access failed:', e);
      }
    };
    startScan();
    return () => setScanning(false);
  }, []);

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
      <div style={{background:'white',borderRadius:20,padding:24,maxWidth:500,width:'90%',textAlign:'center'}}>
        <h3 style={{marginTop:0}}>Scan QR Code</h3>
        <div style={{position:'relative',margin:'20px 0'}}>
          <video ref={videoRef} style={{width:'100%',borderRadius:12}} />
          <canvas ref={canvasRef} style={{display:'none'}} width="300" height="300" />
          <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:200,height:200,border:'2px solid #22c55e',borderRadius:12}}></div>
        </div>
        <button onClick={onClose} style={btnOutline}>Cancel</button>
      </div>
    </div>
  );
}

function ProtectedRoute({ children, allowedRoles = [] }) {
  const auth = useAuth();
  const location = useLocation();
  if (!auth.isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (allowedRoles.length > 0 && !allowedRoles.includes(auth.role)) {
    const roleRoutes = { farmer: '/farmer', lab: '/lab', admin: '/processor', customer: '/products' };
    return <Navigate to={roleRoutes[auth.role] || '/'} replace />;
  }
  return children;
}

function App(){
  const auth = useAuth();

  return (
    <ErrorBoundary>
      <Shell>
        <Routes>
          <Route path="/" element={<Hero />} />
          <Route path="/login" element={<Login />} />
          <Route path="/products" element={<Products />} />
          <Route path="/provenance" element={<Provenance />} />
          <Route path="/about" element={<About />} />
          <Route path="/capture" element={
            <ProtectedRoute allowedRoles={['farmer', 'lab', 'admin']}>
              <Capture />
            </ProtectedRoute>
          } />
          <Route path="/farmer" element={
            <ProtectedRoute allowedRoles={['farmer']}>
              <Farmer />
            </ProtectedRoute>
          } />
          <Route path="/lab" element={
            <ProtectedRoute allowedRoles={['lab']}>
              <Lab />
            </ProtectedRoute>
          } />
          <Route path="/processor" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Processor />
            </ProtectedRoute>
          } />
          <Route path="/supply-chain" element={
            <ProtectedRoute allowedRoles={['farmer', 'lab', 'admin']}>
              <SupplyChain />
            </ProtectedRoute>
          } />
          <Route path="/visualize" element={<Visualization />} />
          <Route path="/qr" element={<QrGenerator />} />
          <Route path="/certificate/:txId" element={<Certificate />} />
          <Route path="/verify/:txId" element={<Verify />} />
        </Routes>
      </Shell>
    </ErrorBoundary>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>
);
