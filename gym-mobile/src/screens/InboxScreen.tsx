import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Search,
  Send,
  ArrowLeft,
  MessageSquare,
  Check,
  CheckCheck,
  Menu,
  Paperclip,
  FileText,
  X,
  Clock,
  AlertCircle,
  Phone,
  ExternalLink,
  CornerUpLeft,
  Play,
  Video as VideoIcon,
} from 'lucide-react-native';
import { api, getBackendUrl, getAuthToken } from '../lib/api';
import { MessageBubble } from '../components/inbox/MessageBubble';
import { ReplyingBanner } from '../components/inbox/ReplyingBanner';
import { getSocket } from '../lib/socket';

interface InboxScreenProps {
  onMenuPress?: () => void;
}

export default function InboxScreen({ onMenuPress }: InboxScreenProps) {
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Chat Thread Modal states
  const [activeConv, setActiveConv] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<any | null>(null);

  // Template picker state
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const socketRef = useRef<any>(null);

  const fetchConversations = async () => {
    try {
      const response = await api.get('/api/dashboard/inbox');
      setConversations(response.data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch conversations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchConversations();

    // Connect and listen for inbox updates via Socket
    const socket = getSocket();
    socketRef.current = socket;

    const handleInboxUpdate = () => {
      fetchConversations();
    };

    socket.on('inbox:update', handleInboxUpdate);
    socket.on('message:new', handleInboxUpdate);

    return () => {
      socket.off('inbox:update', handleInboxUpdate);
      socket.off('message:new', handleInboxUpdate);
    };
  }, []);

  const handleStartChat = async (phoneNumber: string) => {
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length < 8) {
      return; // too short, ignore silently
    }

    try {
      setLoading(true);
      const response = await api.post('/api/dashboard/inbox/create-conversation', {
        phoneNumber: cleaned
      });

      const { conversationId, lead } = response.data;

      const newConv = {
        id: conversationId,
        name: lead.memberName || lead.phoneNumber,
        phone: lead.phoneNumber,
        unreadCount: 0,
        lastMessage: null,
      };

      await fetchConversations();
      setSearch('');
      handleOpenConversation(newConv);
    } catch (err: any) {
      console.warn('Failed to start chat:', err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchConversations();
  };

  // Open a conversation thread
  const handleOpenConversation = async (conv: any) => {
    setActiveConv(conv);
    setLoadingThread(true);
    setMessages([]);
    try {
      // 1. Fetch message history
      const response = await api.get(`/api/dashboard/inbox/${conv.id}`);
      setMessages(response.data.messages || []);

      // 2. Mark conversation as read
      await api.post(`/api/dashboard/inbox/${conv.id}/mark-read`);

      // Update local unread count
      setConversations(prev =>
        prev.map(c => c.id === conv.id ? { ...c, unreadCount: 0 } : c)
      );

      // 3. Join Socket room for live thread updates
      if (socketRef.current) {
        socketRef.current.emit('join-conversation', conv.id);

        // STATUS_PRIORITY map to prevent status downgrades (same as web app)
        const STATUS_PRIORITY: Record<string, number> = {
          failed: 0,
          sending: 0,
          sent: 1,
          delivered: 2,
          received: 2,
          read: 3,
        };

        // Listen for new messages in this thread (web app style)
        socketRef.current.on('message:new', (msg: any) => {
          const mappedMsg = {
            id: msg.id,
            whatsappMessageId: msg.whatsappMessageId,
            content: msg.content || msg.text || '',
            text: msg.text || msg.content || '',
            mediaUrl: msg.mediaUrl,
            mimeType: msg.mimeType,
            caption: msg.caption,
            template: msg.template,
            replyTo: msg.replyTo,
            replyToMessageId: msg.replyToMessageId,
            direction: (msg.direction || 'inbound').toLowerCase(),
            status: (msg.status || 'sent').toLowerCase(),
            createdAt: msg.createdAt || msg.timestamp || new Date().toISOString(),
          };

          setMessages(prev => {
            const exists = prev.some(
              m =>
                m.id === mappedMsg.id ||
                (mappedMsg.whatsappMessageId && m.whatsappMessageId === mappedMsg.whatsappMessageId)
            );
            return exists ? prev : [...prev, mappedMsg];
          });

          // Auto-trigger mark-read for inbound messages when thread is open (sends read receipt to Meta Graph API)
          if (mappedMsg.direction === 'inbound') {
            api.post(`/api/dashboard/inbox/${conv.id}/mark-read`).catch(() => { });
          }

          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        });

        // Listen for status updates (delivered, read) from webhook (web app style)
        socketRef.current.on('message:status', (update: any) => {
          if (!update || (!update.whatsappMessageId && !update.id)) return;
          const targetWaId = update.whatsappMessageId || update.id;
          const newStatus = (update.status || '').toLowerCase();

          setMessages(prev =>
            prev.map(m => {
              if (m.whatsappMessageId !== targetWaId && m.id !== targetWaId) return m;
              const currentPriority = STATUS_PRIORITY[m.status] ?? 0;
              const newPriority = STATUS_PRIORITY[newStatus] ?? 0;
              if (currentPriority >= newPriority && newStatus !== 'failed') return m;
              return { ...m, status: newStatus };
            })
          );
        });
      }
    } catch (err: any) {
      console.warn('Error loading chat thread:', err);
    } finally {
      setLoadingThread(false);
    }
  };

  // Close conversation thread
  const handleCloseConversation = () => {
    if (activeConv && socketRef.current) {
      socketRef.current.emit('leave-conversation', activeConv.id);
    }
    setActiveConv(null);
    setMessages([]);
    setChatError(null);
    setReplyingToMessage(null);
    fetchConversations();
  };

  const handleToggleBot = async () => {
    if (!activeConv) return;
    const targetStatus = !activeConv.isBotDisabled;
    try {
      await api.post(`/api/dashboard/members/${activeConv.id}/toggle-bot`, {
        isBotDisabled: targetStatus
      });
      setActiveConv((prev: any) => prev ? { ...prev, isBotDisabled: targetStatus } : null);
    } catch (err: any) {
      console.warn('Could not toggle chatbot:', err);
    }
  };

  const handleOpenTemplatePicker = async () => {
    setShowTemplatePicker(true);
    setTemplatesLoading(true);
    try {
      const response = await api.get('/api/dashboard/whatsapp/templates');
      const approved = (response.data || []).filter((t: any) =>
        (t.status || '').toUpperCase() === 'APPROVED' || (t.status || '').toUpperCase() === 'ACTIVE'
      );
      setTemplates(approved);
    } catch (err: any) {
      console.warn('Failed to load templates:', err);
      setShowTemplatePicker(false);
    } finally {
      setTemplatesLoading(false);
    }
  };

  const handleSendTemplateToConv = async (template: any) => {
    if (!activeConv) return;
    setShowTemplatePicker(false);
    try {
      await api.post(`/api/dashboard/inbox/${activeConv.id}/send-template`, {
        templateId: template.id
      });
    } catch (err: any) {
      setChatError(err.response?.data?.error || err.message || 'Failed to send template');
      setTimeout(() => setChatError(null), 4000);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !activeConv || sending) return;
    const textToSend = inputText.trim();
    const replyTargetId = replyingToMessage?.whatsappMessageId || replyingToMessage?.id;
    setInputText('');
    setReplyingToMessage(null);
    setSending(true);

    try {
      await api.post(`/api/dashboard/inbox/${activeConv.id}/send`, {
        text: textToSend,
        replyToMessageId: replyTargetId || undefined,
      });
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err: any) {
      setChatError(err.response?.data?.error || err.message || 'Failed to send message');
      setTimeout(() => setChatError(null), 4000);
    } finally {
      setSending(false);
    }
  };

  const handleSendDirectReply = async (replyText: string, targetMsg: any) => {
    if (!replyText.trim() || !activeConv || sending) return;
    const replyTargetId = targetMsg?.whatsappMessageId || targetMsg?.id;
    setSending(true);

    try {
      await api.post(`/api/dashboard/inbox/${activeConv.id}/send`, {
        text: replyText.trim(),
        replyToMessageId: replyTargetId || undefined,
      });
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err: any) {
      setChatError(err.response?.data?.error || err.message || 'Failed to send message');
      setTimeout(() => setChatError(null), 4000);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const filteredConversations = conversations.filter((c: any) => {
    const name = (c.name || c.whatsappName || 'Unnamed').toLowerCase();
    const phone = (c.phone || '');
    const query = search.toLowerCase();
    return name.includes(query) || phone.includes(query);
  });

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {onMenuPress && (
            <TouchableOpacity onPress={onMenuPress} style={{ marginRight: 12 }}>
              <Menu size={22} color="#ffffff" />
            </TouchableOpacity>
          )}
          <Text style={styles.title}>Inbox</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={18} color="#71717a" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search chat..."
          placeholderTextColor="#71717a"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Start Chat Helper Row */}
      {search.replace(/\D/g, '').length >= 8 && (
        <TouchableOpacity
          style={styles.startChatHelperRow}
          onPress={() => handleStartChat(search)}
        >
          <MessageSquare size={18} color="#6366f1" style={{ marginRight: 10 }} />
          <Text style={styles.startChatHelperText}>
            Start Chat with <Text style={{ fontWeight: 'bold', color: '#ffffff' }}>{search}</Text>
          </Text>
        </TouchableOpacity>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Conversation List */}
      <FlatList
        data={filteredConversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.chatRow} onPress={() => handleOpenConversation(item)}>
            <View style={styles.avatar}>
              <MessageSquare size={18} color="#6366f1" />
            </View>
            <View style={styles.chatDetails}>
              <View style={styles.chatHeader}>
                <Text style={styles.chatName}>{item.name || item.whatsappName || 'Unnamed'}</Text>
                <Text style={styles.chatTime}>{formatTime(item.lastMessage?.createdAt || item.lastMessageAt)}</Text>
              </View>
              <View style={styles.chatBody}>
                <Text style={styles.chatMsg} numberOfLines={1}>
                  {item.lastMessage ? item.lastMessage.content : 'No messages yet'}
                </Text>
                {item.unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{item.unreadCount}</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No chats active yet</Text>
          </View>
        }
        contentContainerStyle={styles.listContainer}
      />

      {/* Chat Thread Modal */}
      {activeConv && (
        <Modal
          visible={true}
          animationType="slide"
          onRequestClose={handleCloseConversation}
        >
          <SafeAreaView style={styles.modalContainer}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.keyboardContainer}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={handleCloseConversation} style={styles.backButton}>
                  <ArrowLeft size={22} color="#e9edef" />
                </TouchableOpacity>
                {/* Avatar */}
                <View style={styles.chatAvatar}>
                  <Text style={styles.chatAvatarText}>
                    {(activeConv.name || activeConv.whatsappName || '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.modalTitleContainer}>
                  <Text style={styles.modalName}>{activeConv.name || activeConv.whatsappName || 'Chat'}</Text>
                  <Text style={styles.modalPhone}>{activeConv.phone}</Text>
                </View>
                <TouchableOpacity
                  onPress={handleToggleBot}
                  style={[
                    styles.botToggleBadge,
                    activeConv.isBotDisabled ? styles.botDisabledBadge : styles.botEnabledBadge
                  ]}
                >
                  <Text style={styles.botToggleText}>
                    {activeConv.isBotDisabled ? 'Bot Paused' : 'Bot Active'}
                  </Text>
                </TouchableOpacity>

                <View style={[
                  styles.windowBadge,
                  activeConv.sessionActive ? styles.windowActive : styles.windowExpired
                ]}>
                  <Text style={[styles.windowText, activeConv.sessionActive ? styles.windowActiveText : styles.windowExpiredText]}>
                    {activeConv.sessionActive ? 'Active' : 'Expired'}
                  </Text>
                </View>
              </View>

              {/* Session Expired Banner — shown at top */}
              {activeConv && !activeConv.sessionActive && (
                <View style={styles.sessionBanner}>
                  <Text style={styles.sessionBannerText}>⏱ 24-hour session expired — send a template to re-open the window</Text>
                </View>
              )}

              {/* Message History */}
              {loadingThread ? (
                <View style={[styles.threadLoader, styles.chatBackground]}>
                  <ActivityIndicator size="large" color="#8ea0bc" />
                </View>
              ) : (
                <FlatList
                  ref={flatListRef}
                  data={messages}
                  keyExtractor={(item, index) => item.id ? `${item.id}-${index}` : `msg-${index}`}
                  style={styles.chatBackground}
                  contentContainerStyle={styles.chatList}
                  onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                  renderItem={({ item, index }) => {
                    const isMe = item.direction === 'outbound' || item.direction === 'outbound-api' || item.sender === 'executive';
                    const prevItem = index > 0 ? messages[index - 1] : null;
                    const showDate = !prevItem || (
                      new Date(messages[index - 1].createdAt).toDateString() !== new Date(item.createdAt).toDateString()
                    );
                    const getDateLabel = (iso: string) => {
                      const d = new Date(iso);
                      const today = new Date();
                      const yesterday = new Date();
                      yesterday.setDate(today.getDate() - 1);
                      if (d.toDateString() === today.toDateString()) return 'Today';
                      if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
                      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                    };
                    const formattedTime = item.createdAt
                      ? new Date(item.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()
                      : formatTime(item.createdAt);

                    return (
                      <MessageBubble
                        item={item}
                        isMe={isMe}
                        activeConv={activeConv}
                        messages={messages}
                        showDate={showDate}
                        getDateLabel={getDateLabel}
                        formattedTime={formattedTime}
                        authToken={getAuthToken()}
                        getBackendUrl={getBackendUrl}
                        onSelectReply={(msg) => setReplyingToMessage(msg)}
                        onSendDirectReply={handleSendDirectReply}
                      />
                    );
                  }}
                  ListEmptyComponent={
                    <View style={styles.emptyChatContainer}>
                      <MessageSquare size={40} color="#334155" />
                      <Text style={styles.emptyChatText}>No messages yet</Text>
                      <Text style={styles.emptyChatSubText}>Start the conversation below</Text>
                    </View>
                  }
                />
              )}

              {/* Inline error toast */}
              {chatError && (
                <View style={styles.errorToast}>
                  <Text style={styles.errorToastText}>{chatError}</Text>
                </View>
              )}

              {/* Replying Banner */}
              <ReplyingBanner
                replyingToMessage={replyingToMessage}
                activeConv={activeConv}
                onCancel={() => setReplyingToMessage(null)}
              />

              {/* Input Box — or Send Template CTA when expired */}
              {activeConv.sessionActive ? (
                <View style={styles.inputContainer}>
                  <TouchableOpacity
                    style={styles.attachButton}
                    onPress={handleOpenTemplatePicker}
                  >
                    <Paperclip size={20} color="#8ea0bc" />
                  </TouchableOpacity>
                  <TextInput
                    style={styles.chatInput}
                    placeholder="Type a message..."
                    placeholderTextColor="#52525b"
                    value={inputText}
                    onChangeText={setInputText}
                    multiline={true}
                    maxLength={1000}
                  />
                  <TouchableOpacity
                    style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                    onPress={handleSendMessage}
                    disabled={!inputText.trim()}
                  >
                    <Send size={18} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.expiredInputContainer}>
                  <TouchableOpacity
                    style={styles.sendTemplateBtn}
                    onPress={handleOpenTemplatePicker}
                  >
                    <FileText size={16} color="#ffffff" style={{ marginRight: 8 }} />
                    <Text style={styles.sendTemplateBtnText}>Send Template to Re-open Chat</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Template Picker Modal */}
              <Modal
                visible={showTemplatePicker}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowTemplatePicker(false)}
              >
                <View style={styles.pickerOverlay}>
                  <View style={styles.pickerSheet}>
                    <View style={styles.pickerHeader}>
                      <Text style={styles.pickerTitle}>Choose a Template</Text>
                      <TouchableOpacity onPress={() => setShowTemplatePicker(false)}>
                        <X size={20} color="#8ea0bc" />
                      </TouchableOpacity>
                    </View>
                    {templatesLoading ? (
                      <View style={styles.pickerLoader}>
                        <ActivityIndicator size="large" color="#00a884" />
                      </View>
                    ) : templates.length === 0 ? (
                      <View style={styles.pickerLoader}>
                        <Text style={styles.pickerEmptyText}>No approved templates found.</Text>
                      </View>
                    ) : (
                      <FlatList
                        data={templates}
                        keyExtractor={(t) => t.id}
                        contentContainerStyle={{ paddingBottom: 24 }}
                        renderItem={({ item }) => (
                          <TouchableOpacity
                            style={styles.pickerItem}
                            onPress={() => handleSendTemplateToConv(item)}
                          >
                            <View style={styles.pickerItemIcon}>
                              <FileText size={18} color="#00a884" />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.pickerItemName}>{item.templateName}</Text>
                              <Text style={styles.pickerItemMeta}>{item.category} · {item.language}</Text>
                            </View>
                            <Send size={14} color="#00a884" />
                          </TouchableOpacity>
                        )}
                      />
                    )}
                  </View>
                </View>
              </Modal>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#09090b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: '#18181b',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    margin: 16,
    paddingHorizontal: 12,
    height: 46,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 15,
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 10,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  chatDetails: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  chatTime: {
    fontSize: 12,
    color: '#71717a',
  },
  chatBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatMsg: {
    fontSize: 14,
    color: '#a1a1aa',
    flex: 1,
    marginRight: 10,
  },
  unreadBadge: {
    backgroundColor: '#6366f1',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  unreadText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#71717a',
    fontSize: 15,
  },

  // Chat Thread Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#0b141a',
  },
  keyboardContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#1f2c34',
    backgroundColor: '#111b21',
  },
  backButton: {
    padding: 6,
    marginRight: 8,
  },
  chatAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#00a884',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  chatAvatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#e9edef',
  },
  modalPhone: {
    fontSize: 12,
    color: '#8ea0bc',
    marginTop: 1,
  },
  windowBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  windowActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  windowExpired: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  windowText: {
    fontSize: 10,
    fontWeight: '600',
  },
  windowActiveText: {
    color: '#4ade80',
  },
  windowExpiredText: {
    color: '#f87171',
  },
  chatBackground: {
    flex: 1,
    backgroundColor: '#0b141a',
  },
  threadLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatList: {
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateSeparatorText: {
    fontSize: 11,
    color: '#8ea0bc',
    backgroundColor: '#182229',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#222d34',
    fontWeight: '500',
  },
  msgWrapper: {
    flexDirection: 'row',
    marginBottom: 4,
    width: '100%',
  },
  msgMe: {
    justifyContent: 'flex-end',
  },
  msgOther: {
    justifyContent: 'flex-start',
  },
  bubble: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    maxWidth: '78%',
  },
  bubbleMe: {
    backgroundColor: '#005c4b',
    borderTopRightRadius: 0,
  },
  bubbleOther: {
    backgroundColor: '#202c33',
    borderTopLeftRadius: 0,
  },
  msgContent: {
    fontSize: 14,
    lineHeight: 19,
  },
  msgContentMe: {
    color: '#e9edef',
  },
  msgContentOther: {
    color: '#f8fafc',
  },
  msgMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 3,
    gap: 3,
  },
  msgTime: {
    fontSize: 10,
  },
  msgTimeMe: {
    color: '#8ea0bc',
  },
  msgTimeOther: {
    color: '#8ea0bc',
  },
  statusWrapper: {
    marginLeft: 2,
  },
  sendingText: {
    color: '#8ea0bc',
    fontSize: 10,
  },
  sessionBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderBottomWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    paddingVertical: 9,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  sessionBannerText: {
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  emptyChatContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 8,
  },
  emptyChatText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyChatSubText: {
    color: '#334155',
    fontSize: 13,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: '#1e293b',
    backgroundColor: '#111827',
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#e9edef',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#00a884',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  sendButtonDisabled: {
    backgroundColor: '#1e293b',
    opacity: 0.6,
  },
  botToggleBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 4,
    borderWidth: 1,
  },
  botDisabledBadge: {
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderColor: 'rgba(234, 179, 8, 0.3)',
  },
  botEnabledBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  botToggleText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  startChatHelperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderColor: 'rgba(99, 102, 241, 0.3)',
    borderWidth: 1,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
  },
  startChatHelperText: {
    fontSize: 14,
    color: '#a1a1aa',
  },
  attachButton: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  expiredInputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: '#1e293b',
    backgroundColor: '#111827',
  },
  sendTemplateBtn: {
    backgroundColor: '#00a884',
    borderRadius: 12,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  sendTemplateBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    borderTopWidth: 1,
    borderColor: '#1e293b',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: '#1e293b',
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e9edef',
  },
  pickerLoader: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  pickerEmptyText: {
    color: '#475569',
    fontSize: 14,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#1e293b',
    gap: 12,
  },
  pickerItemIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 168, 132, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 132, 0.25)',
  },
  pickerItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e9edef',
    marginBottom: 2,
  },
  pickerItemMeta: {
    fontSize: 12,
    color: '#64748b',
    textTransform: 'uppercase',
  },
  errorToast: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderTopWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  errorToastText: {
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  quoteBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderLeftWidth: 3,
    borderLeftColor: '#00ed64',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 6,
  },
  quoteAuthor: {
    color: '#00ed64',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  quoteText: {
    color: '#cbd5e1',
    fontSize: 12,
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderTopWidth: 1,
    borderColor: '#1e293b',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  replyBannerBar: {
    width: 4,
    height: '100%',
    backgroundColor: '#00ed64',
    borderRadius: 2,
  },
  replyBannerAuthor: {
    color: '#00ed64',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  replyBannerText: {
    color: '#cbd5e1',
    fontSize: 12,
  },
  templateHeaderBox: {
    marginBottom: 6,
    borderRadius: 8,
    overflow: 'hidden',
  },
  templateHeaderMedia: {
    width: '100%',
    height: 140,
    borderRadius: 8,
  },
  templateHeaderText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  templateFooterText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
  },
  templateButtonsContainer: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 6,
    gap: 4,
  },
  templateButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  templateButtonText: {
    color: '#00ed64',
    fontSize: 13,
    fontWeight: '600',
  },
  bubbleImageOnly: {
    padding: 3,
    paddingBottom: 4,
    maxWidth: '84%',
  },
  bubbleMediaImage: {
    width: 250,
    height: 190,
    borderRadius: 8,
    marginBottom: 2,
  },
  mediaPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    marginBottom: 4,
  },
  bubbleStickerImage: {
    width: 150,
    height: 150,
    borderRadius: 8,
    marginBottom: 2,
  },
  mediaPlaceholderText: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '500',
  },
});
