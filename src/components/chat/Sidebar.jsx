import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Search } from 'lucide-react';
import { fetchThreads, setActiveRoom } from '../../features/chat/chatSlice';

export default function Sidebar() {
  const dispatch = useDispatch();
  const threads = useSelector((state) => state.chat.threads);
  const activeRoomId = useSelector((state) => state.chat.activeRoomId);
  const socketConnected = useSelector((state) => state.chat.socketConnected);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    dispatch(fetchThreads({ page: 1, limit: 20 }));
  }, [dispatch]);

  const filteredThreads = (threads || []).filter(thread => 
    thread.participantName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    thread.lastMessage?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-80 h-full border-r border-dark-border flex flex-col bg-[#2b2b2b] rounded-l-2xl shrink-0">
      <div className="p-6 pb-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-dark-text-muted">
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#363636] border border-transparent rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-dark-text-muted focus:outline-none focus:border-dark-border transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-custom space-y-0.5 py-2">
        {filteredThreads.map((thread) => (
          <div
            key={thread.roomId}
            onClick={() => {
              if (activeRoomId !== thread.roomId) {
                dispatch(setActiveRoom(thread.roomId));
              }
            }}
            className={`px-6 py-3.5 cursor-pointer transition-all flex items-center gap-4 ${
              activeRoomId === thread.roomId 
                ? 'bg-white/5 border-l-2 border-primary' 
                : 'hover:bg-white/5 border-l-2 border-transparent'
            }`}
          >
            <div className="relative shrink-0">
              <img 
                src={thread.profileImage || `https://ui-avatars.com/api/?name=${thread.participantName}&background=random`} 
                alt={thread.participantName}
                className="w-12 h-12 rounded-full object-cover"
              />
              {thread.isOnline && (
                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-dark-bg rounded-full"></div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-1">
                <h3 className="text-white text-sm font-medium truncate">{thread.participantName}</h3>
                <span className="text-[10px] text-dark-text-muted shrink-0 mt-0.5">
                  {thread.lastMessageTime ? new Date(thread.lastMessageTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs text-dark-text-muted truncate flex-1">
                  {thread.lastMessage || 'Start a conversation'}
                </p>
                {thread.unseenCount > 0 && (
                  <span className="ml-2 bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {thread.unseenCount}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
