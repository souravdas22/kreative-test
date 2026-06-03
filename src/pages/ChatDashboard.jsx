import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { onMessage } from 'firebase/messaging';
import { messaging } from '../firebase';
import { LogOut, MessageSquare, Bell } from 'lucide-react';
import Sidebar from '../components/chat/Sidebar';
import MainChat from '../components/chat/MainChat';
import { logout } from '../features/auth/authSlice';

export default function ChatDashboard() {
  const dispatch = useDispatch();
  const currentUser = useSelector((state) => state.auth.user);
  const activeRoomId = useSelector((state) => state.chat.activeRoomId);

  useEffect(() => {
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('🔥 [FCM Foreground] Message received!', payload);
      
      const incomingRoomId = payload.data?.roomId;
      console.log(`[FCM Foreground] Incoming Room ID: ${incomingRoomId} | Currently Active Room ID: ${activeRoomId}`);
      
      if (incomingRoomId !== activeRoomId) {
        console.log('[FCM Foreground] IDs do not match (or no active room). Showing system notification.');
        const notificationTitle = payload.notification?.title || 'New Message';
        const notificationOptions = {
          body: payload.notification?.body || 'You have received a new message.',
          icon: '/favicon.svg'
        };

        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(notificationTitle, notificationOptions);
          console.log('[FCM Foreground] System notification dispatched.');
        } else {
          console.log('[FCM Foreground] Notification permission not granted. Cannot show popup.');
        }
      } else {
        console.log('[FCM Foreground] Incoming message belongs to the currently active room. Suppressing notification.');
      }
    });

    return () => unsubscribe();
  }, [activeRoomId]);

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <div className="h-screen w-full bg-dark-bg flex overflow-hidden text-dark-text">
      {/* Left Navigation Menu */}
      <div className="w-[260px] bg-[#2b2b2b] border-r border-dark-border flex flex-col justify-between shrink-0 m-4 rounded-2xl shadow-lg">
        <div>
          {/* Logo */}
          <div className="p-8 flex items-center justify-center">
            <h1 className="text-xl font-bold tracking-tight text-white flex flex-col items-center">
              <span>kre-a-tiv</span>
              <span className="flex items-center text-2xl">
                <span className="text-primary font-black text-3xl mr-0.5">V</span>AULT
              </span>
            </h1>
          </div>
          
          {/* Menu */}
          <div className="px-4 space-y-2 mt-4">
            <div className="flex items-center gap-3 px-4 py-3 bg-primary text-white rounded-xl cursor-pointer shadow-[0_0_15px_rgba(11,102,56,0.3)]">
              <MessageSquare size={20} />
              <span className="font-medium text-sm">Messages</span>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 mb-2">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-dark-text-muted hover:text-white hover:bg-white/5 rounded-xl cursor-pointer transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium text-sm">Logout</span>
          </button>
        </div>
      </div>
      
      {/* Right Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header */}
        <div className="h-[90px] px-8 flex items-center justify-between shrink-0">
          <h2 className="text-2xl font-semibold text-white">Messages</h2>
          
          <div className="flex items-center gap-6">
            <button className="text-dark-text-muted hover:text-white transition-colors relative">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full"></span>
            </button>
            <div className="flex items-center gap-3">
              <img 
                src={`https://ui-avatars.com/api/?name=${currentUser?.name || 'John Smith'}&background=random`} 
                alt="User Profile" 
                className="w-10 h-10 rounded-full"
              />
              <div>
                <p className="text-sm font-medium text-white">{currentUser?.name || 'John Smith'}</p>
                <p className="text-xs text-dark-text-muted">{currentUser?.location || 'Vancouver, BC'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Interface Area */}
        <div className="flex flex-1 overflow-hidden pb-4 pr-4">
          <Sidebar />
          <MainChat />
        </div>
      </div>
    </div>
  );
}
