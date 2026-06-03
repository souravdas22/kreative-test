import React, { useState, useEffect, useRef, Fragment } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Send, Plus, Mic, Video, Image as ImageIcon, Smile, AlertTriangle, MoreVertical, FileText, X, Square, MessageSquare, Download } from 'lucide-react';
import { fetchMessages, fetchUserProfile } from '../../features/chat/chatSlice';
import { logout } from '../../features/auth/authSlice';
import { useSocket } from '../../hooks/useSocket';
import EmojiPicker from 'emoji-picker-react';

export default function MainChat() {
  const dispatch = useDispatch();
  const activeRoomId = useSelector((state) => state.chat.activeRoomId);
  const messages = useSelector((state) => state.chat.messages);
  const profile = useSelector((state) => state.chat.activeUserProfile);
  const { joinRoom, sendMessage, markAsSeen } = useSocket();
  const currentUser = useSelector((state) => state.auth.user);
  
  const getLastReceivedMessage = () => {
    if (!messages || messages.length === 0) return null;
    
    // Only look at the absolute last message in the chat
    const lastMsg = messages[messages.length - 1];
    const isMe = lastMsg.senderId === currentUser?._id || lastMsg.senderId === currentUser?.id || lastMsg.isSender;
    
    // If the last message was sent by me, do not show suggestions
    if (isMe) return null;
    
    if (!lastMsg.type || lastMsg.type === 'text') {
      return lastMsg.content.toLowerCase();
    }
    
    return null;
  };

  const getSmartReplies = () => {
    const lastText = getLastReceivedMessage();
    if (!lastText) return [];

    if (lastText.includes('thank') || lastText.includes('thx')) {
      return ["You're welcome! 😊", "No problem!", "Anytime!"];
    }
    if (lastText.match(/\b(hello|hi|hey|greetings)\b/)) {
      return ["Hello! 👋", "Hi there!", "How can I help you?"];
    }
    if (lastText.match(/\b(bye|goodbye|see ya)\b/)) {
      return ["Goodbye! 👋", "Have a great day!", "Talk to you later."];
    }
    if (lastText.includes('?')) {
      return ["Let me check on that.", "Could you provide more details?", "I'll get back to you shortly."];
    }
    
    return [];
  };

  const fastReplies = getSmartReplies();

  const [inputText, setInputText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const inputRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);

  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        // Only close if we are not clicking the toggle button
        const isToggleButton = event.target.closest('#attachment-toggle-btn');
        if (!isToggleButton) {
          setShowEmojiPicker(false);
        }
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      recorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([audioBlob], `recording-${Date.now()}.webm`, { type: 'audio/webm' });
        setSelectedFiles([file]);
        stream.getTracks().forEach(track => track.stop());
      };
      
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setShowAttachmentMenu(false);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Could not access microphone. Please allow microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  useEffect(() => {
    if (activeRoomId) {
      dispatch(fetchUserProfile(activeRoomId));
      dispatch(fetchMessages({ roomId: activeRoomId, page: 1, limit: 50 }));
      joinRoom(activeRoomId);
      markAsSeen(activeRoomId);
    }
  }, [activeRoomId, dispatch]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
    if (activeRoomId) {
       markAsSeen(activeRoomId);
    }
  }, [messages, activeRoomId]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() && selectedFiles.length === 0) return;

    if (selectedFiles.length > 0) {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append('files', file);
      });
      
      let type = 'file';
      if (selectedFiles[0].type.startsWith('image/')) type = 'photo';
      else if (selectedFiles[0].type.startsWith('video/')) type = 'video';
      else if (selectedFiles[0].type.startsWith('audio/')) type = 'audio';
      
      formData.append('type', type);

      try {
        const token = localStorage.getItem('chat_token');
        await fetch(`${import.meta.env.VITE_BASE_URL || 'http://localhost:1947'}/api/v1/chat/upload/${activeRoomId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
        setSelectedFiles([]);
      } catch (err) {
        console.error('File upload failed:', err);
      }
    }

    if (inputText.trim()) {
      sendMessage(activeRoomId, inputText.trim(), 'text');
      setInputText('');
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const renderMessageContent = (msg) => {
    if (msg.type === 'photo') {
      return <img src={msg.content} alt="Photo" className="max-w-[250px] rounded-lg" onLoad={scrollToBottom} />;
    } else if (msg.type === 'video') {
      return <video src={msg.content} controls className="max-w-[250px] rounded-lg" onLoadedData={scrollToBottom} />;
    } else if (msg.type === 'audio') {
      return <audio src={msg.content} controls className="max-w-[250px]" onLoadedData={scrollToBottom} />;
    } else if (msg.type === 'file') {
      return (
        <a href={msg.content} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 underline">
          <FileText size={18} /> Download File
        </a>
      );
    }
    return <p className="leading-relaxed text-sm">{msg.content}</p>;
  };

  if (!activeRoomId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#2b2b2b] rounded-r-2xl relative">
        <div className="w-24 h-24 mb-6 rounded-full bg-white/5 flex items-center justify-center">
          <MessageSquare size={40} className="text-dark-text-muted" />
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Your Messages</h2>
        <p className="text-dark-text-muted">Select a conversation from the sidebar to start chatting</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full relative bg-[#2b2b2b] rounded-r-2xl">
      {/* Header */}
      <div className="h-[80px] px-8 flex items-center justify-between shrink-0 border-b border-dark-border/50">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img 
              src={profile?.profileImage || `https://ui-avatars.com/api/?name=${profile?.fullName}&background=random`} 
              alt={profile?.fullName}
              className="w-10 h-10 rounded-full object-cover"
            />
          </div>
          <div>
            <h2 className="text-white font-medium text-lg leading-tight">{profile?.fullName}</h2>
            <p className="text-xs text-dark-text-muted">
              {profile?.isOnline ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>
        <div className="flex items-center text-dark-text-muted">
          <button className="hover:text-white transition-colors p-2 rounded-full hover:bg-white/5">
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-custom">
        {(() => {
          const groupedMessages = [];
          let currentGroup = null;

          messages.forEach((msg) => {
            const isMe = msg.senderId === currentUser?._id || msg.senderId === currentUser?.id || msg.isSender;
            
            if (msg.type === 'photo') {
              if (
                currentGroup && 
                currentGroup.isPhotoGroup && 
                currentGroup.isMe === isMe && 
                Math.abs(new Date(msg.createdAt) - new Date(currentGroup.createdAt)) < 60000
              ) {
                currentGroup.messages.push(msg);
              } else {
                currentGroup = {
                  id: msg._id,
                  isPhotoGroup: true,
                  isMe: isMe,
                  createdAt: msg.createdAt,
                  messages: [msg]
                };
                groupedMessages.push(currentGroup);
              }
            } else {
              currentGroup = {
                id: msg._id,
                isPhotoGroup: false,
                isMe: isMe,
                createdAt: msg.createdAt,
                messages: [msg]
              };
              groupedMessages.push(currentGroup);
            }
          });

          const formatDateDivider = (dateString) => {
            if (!dateString) return '';
            const date = new Date(dateString);
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            if (date.toDateString() === today.toDateString()) {
              return 'Today';
            } else if (date.toDateString() === yesterday.toDateString()) {
              return 'Yesterday';
            } else {
              return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            }
          };

          let lastDateString = null;

          return groupedMessages.map((group, idx) => {
            const isMe = group.isMe;
            
            const currentDateString = new Date(group.createdAt || Date.now()).toDateString();
            const showDivider = currentDateString !== lastDateString;
            lastDateString = currentDateString;

            const dividerUI = showDivider ? (
              <div className="flex justify-center my-6 w-full">
                <span className="bg-[#363636] text-white text-[11px] font-medium px-4 py-1.5 rounded-full shadow-sm">
                  {formatDateDivider(group.createdAt || Date.now())}
                </span>
              </div>
            ) : null;

            let groupUI = null;

            if (group.isPhotoGroup && group.messages.length > 1) {
              groupUI = (
                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 fade-in duration-300 w-full`}>
                  {!isMe && (
                    <div className="flex items-center gap-2 mb-2 ml-1">
                      <img src={profile?.profileImage || `https://ui-avatars.com/api/?name=${profile?.fullName}&background=random`} alt={profile?.fullName} className="w-6 h-6 rounded-full object-cover" />
                      <span className="text-sm font-semibold text-white">{profile?.fullName}</span>
                      <span className="text-xs text-dark-text-muted">{new Date(group.createdAt || Date.now()).toLocaleTimeString([], { weekday: 'long', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                  
                  <div className={`flex flex-col mb-1 ${isMe ? 'items-end' : 'items-start'} max-w-[80%]`}>
                    {!isMe ? (
                      <span className="text-[13px] font-bold text-white ml-1 mb-3">Attachments</span>
                    ) : (
                      <span className="text-[13px] font-bold text-white mr-1 mb-3 text-right">Attachments</span>
                    )}
                    <div className={`flex flex-wrap gap-4 ${isMe ? 'justify-end' : 'justify-start'}`}>
                      {group.messages.map((m, i) => {
                        const urlParts = m.content.split('/');
                        const fileName = urlParts[urlParts.length - 1] || `Image ${i+1}.jpg`;
                        return (
                          <div key={i} className="flex flex-col gap-2 relative group w-[180px]">
                            <div className="relative overflow-hidden rounded-2xl aspect-[4/3] shadow-md border border-dark-border/30">
                              <img src={m.content} alt="Attachment" className="w-full h-full object-cover rounded-2xl transition-transform duration-300 group-hover:scale-105" onLoad={scrollToBottom} />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <a href={m.content} download target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-primary shadow-lg hover:scale-110 transition-transform">
                                  <Download size={20} className="ml-0.5" />
                                </a>
                              </div>
                            </div>
                            <span className="text-xs text-dark-text-muted px-1 truncate">{fileName}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {isMe && (
                    <div className="flex items-center gap-1 mt-1 mr-1">
                      <span className="text-[10px] text-dark-text-muted">{new Date(group.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                </div>
              );
            } else {
              const msg = group.messages[0];
              groupUI = (
                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 fade-in duration-300`}>
                  {!isMe && (
                    <div className="flex items-center gap-2 mb-1.5 ml-1">
                      <img src={profile?.profileImage || `https://ui-avatars.com/api/?name=${profile?.fullName}&background=random`} alt={profile?.fullName} className="w-6 h-6 rounded-full object-cover" />
                      <span className="text-sm font-semibold text-white">{profile?.fullName}</span>
                      <span className="text-xs text-dark-text-muted">{new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { weekday: 'long', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                  
                  <div className={`max-w-[70%] px-5 py-3.5 shadow-sm ${
                    isMe 
                      ? 'bg-[#363636] text-white rounded-[20px] rounded-br-sm'
                      : 'bg-[#363636] text-white rounded-[20px] rounded-tl-sm'
                  }`}>
                    {renderMessageContent(msg)}
                  </div>
                  
                  {isMe && (
                    <div className="flex items-center gap-1 mt-1 mr-1">
                      <span className="text-[10px] text-dark-text-muted">{new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Fragment key={group.id || idx}>
                {dividerUI}
                {groupUI}
              </Fragment>
            );
          });
        })()}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 pt-2 shrink-0 relative flex flex-col gap-2">
        {/* Fast Replies */}
        {!isRecording && selectedFiles.length === 0 && fastReplies.length > 0 && inputText.length === 0 && (
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
            {fastReplies.map((reply, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setInputText(reply);
                  setTimeout(() => inputRef.current?.focus(), 0);
                }}
                className="whitespace-nowrap px-4 py-1.5 bg-[#363636] hover:bg-primary/20 text-[13px] font-medium text-dark-text-muted hover:text-white rounded-full transition-colors border border-dark-border/50 hover:border-primary/50 flex-shrink-0 shadow-sm"
              >
                {reply}
              </button>
            ))}
          </div>
        )}

        {selectedFiles.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {selectedFiles.map((file, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-[#363636] p-2 rounded-xl border border-dark-border">
                <FileText size={16} className="text-primary" />
                <span className="text-xs text-white truncate max-w-[150px]">{file.name}</span>
                <button type="button" onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))} className="text-dark-text-muted hover:text-red-400">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSend} className="w-full relative">
          {showAttachmentMenu && (
            <div className="absolute bottom-[110%] left-0 bg-[#363636] rounded-2xl shadow-lg p-1.5 flex items-center gap-1 z-50">
              <button type="button" onClick={startRecording} className="p-2 text-dark-text-muted hover:text-white hover:bg-white/10 rounded-xl transition-colors" title="Audio">
                <Mic size={18} />
              </button>
              <button type="button" onClick={() => { fileInputRef.current.accept="video/*"; fileInputRef.current?.click(); setShowAttachmentMenu(false); }} className="p-2 text-dark-text-muted hover:text-white hover:bg-white/10 rounded-xl transition-colors" title="Video">
                <Video size={18} />
              </button>
              <button type="button" onClick={() => { fileInputRef.current.accept="image/*"; fileInputRef.current?.click(); setShowAttachmentMenu(false); }} className="p-2 text-dark-text-muted hover:text-white hover:bg-white/10 rounded-xl transition-colors" title="Image">
                <ImageIcon size={18} />
              </button>
              <button type="button" onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowAttachmentMenu(false); }} className="p-2 text-dark-text-muted hover:text-white hover:bg-white/10 rounded-xl transition-colors" title="Emoji">
                <Smile size={18} />
              </button>
              <button type="button" className="p-2 text-dark-text-muted hover:text-white hover:bg-white/10 rounded-xl transition-colors" title="Alert">
                <AlertTriangle size={18} />
              </button>
            </div>
          )}

          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple />

          <div className="flex items-center bg-[#1e1e1e] rounded-full p-1.5 pl-4 w-full">
            <button 
              id="attachment-toggle-btn"
              type="button" 
              onClick={() => {
                if (showEmojiPicker) {
                  setShowEmojiPicker(false);
                } else {
                  setShowAttachmentMenu(!showAttachmentMenu);
                }
              }}
              className="text-dark-text-muted hover:text-white transition-all shrink-0 mr-2"
            >
              <Plus size={20} className={showAttachmentMenu || showEmojiPicker ? 'rotate-45 transition-transform' : 'transition-transform'} />
            </button>

            {isRecording ? (
              <div className="flex-1 flex items-center justify-between text-red-400 py-2.5 px-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
                  <span className="text-sm">Recording... {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</span>
                </div>
                <button type="button" onClick={stopRecording} className="text-red-400 hover:text-red-300 transition-colors p-1 rounded-full hover:bg-red-500/10" title="Stop Recording">
                  <Square size={18} fill="currentColor" />
                </button>
              </div>
            ) : (
              <input
                type="text"
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type your message here"
                className="flex-1 bg-transparent border-none py-2.5 px-2 text-sm text-white placeholder:text-dark-text-muted focus:outline-none focus:ring-0"
              />
            )}

            <button
              type="submit"
              disabled={(!inputText.trim() && selectedFiles.length === 0) || isRecording}
              className="w-10 h-10 bg-primary hover:bg-primary-dark text-white rounded-full flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0 ml-2"
            >
              <Send size={18} className={inputText.trim() || selectedFiles.length > 0 ? 'translate-x-0.5 -translate-y-0.5' : ''} />
            </button>
          </div>

          {showEmojiPicker && (
            <div ref={emojiPickerRef} className="absolute bottom-[130%] right-0 z-50 shadow-[0_0_40px_rgba(0,0,0,0.5)] rounded-2xl overflow-hidden border border-dark-border">
              <EmojiPicker theme="dark" onEmojiClick={(emojiObject) => setInputText(prev => prev + emojiObject.emoji)} />
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
