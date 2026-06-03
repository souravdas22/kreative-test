import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setCredentials } from '../features/auth/authSlice';
import { Mail, Lock, ArrowRight, MessageSquare } from 'lucide-react';
import { getToken } from 'firebase/messaging';
import { messaging } from '../firebase';

export default function Login() {
  const [email, setEmail] = useState('ethan.stone@yopmail.com');
  const [password, setPassword] = useState('Test@123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      let deviceToken = "";
      try {
        if ('Notification' in window) {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            const swUrl = `/firebase-messaging-sw.js?apiKey=${import.meta.env.VITE_FIREBASE_API_KEY}&authDomain=${import.meta.env.VITE_FIREBASE_AUTH_DOMAIN}&projectId=${import.meta.env.VITE_FIREBASE_PROJECT_ID}&storageBucket=${import.meta.env.VITE_FIREBASE_STORAGE_BUCKET}&messagingSenderId=${import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID}&appId=${import.meta.env.VITE_FIREBASE_APP_ID}&measurementId=${import.meta.env.VITE_FIREBASE_MEASUREMENT_ID}`;
            const registration = await navigator.serviceWorker.register(swUrl);
            const token = await getToken(messaging, {
              vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
              serviceWorkerRegistration: registration
            });
            if (token) {
              deviceToken = token;
            }
          }
        }
      } catch (fcmError) {
        console.error('Error getting FCM token during login:', fcmError);
      }
      
      // Fallback if the user denies permission, or the browser blocks it, to prevent backend 400 error
      if (!deviceToken) {
        deviceToken = "not-granted";
      }

      const response = await fetch('http://127.0.0.1:1947/api/v1/auth/login-user', {
        method: 'POST',
        headers: {
          'accept': '*/*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, deviceToken })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Assuming backend returns a token in data.token or data.data.token
      // Adjust according to actual response structure if needed.
      // Usually NestJS sends { accessToken: '...' } or { token: '...' } or { data: { token: '...' } }
      const token = data.token || data.accessToken || (data.data && data.data.token) || (data.data && data.data.accessToken);
      const user = data.user || (data.data && data.data.user) || { email };
      
      dispatch(setCredentials({ user, token }));
      navigate('/chat');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-dark-bg via-[#1a1c23] to-[#0f172a] relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/20 blur-[120px] animate-pulse delay-1000"></div>

      <div className="glass-panel p-10 rounded-3xl w-full max-w-md z-10 relative">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 text-primary mb-6 shadow-[0_0_20px_rgba(14,165,233,0.3)]">
            <MessageSquare size={32} />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Welcome Back</h1>
          <p className="text-dark-text-muted">Sign in to continue to Chat App</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-dark-text-muted group-focus-within:text-primary transition-colors">
                <Mail size={20} />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-dark-border rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-dark-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                placeholder="Email address"
                required
              />
            </div>

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-dark-text-muted group-focus-within:text-primary transition-colors">
                <Lock size={20} />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-dark-border rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-dark-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                placeholder="Password"
                required
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full glass-button py-3 rounded-xl font-medium flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <span>{loading ? 'Signing in...' : 'Sign In'}</span>
            {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>
      </div>
    </div>
  );
}
