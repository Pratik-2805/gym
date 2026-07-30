import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FileText, RefreshCw, Layers, Globe, Menu, X, Trash2, Send, CheckCheck, MessageSquare, ExternalLink, Phone, ArrowLeft } from 'lucide-react-native';
import { api } from '../lib/api';

interface TemplatesScreenProps {
  onMenuPress?: () => void;
}

export default function TemplatesScreen({ onMenuPress }: TemplatesScreenProps) {
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Modal & Detail actions states
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Send flow states
  const [isSending, setIsSending] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [membersLoading, setMembersLoading] = useState(false);

  const handleSendTemplate = async (template: any) => {
    setIsSending(true);
    setMembersLoading(true);
    try {
      const response = await api.get('/api/dashboard/members');
      setMembers(response.data.members || []);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to fetch members');
    } finally {
      setMembersLoading(false);
    }
  };

  const handleConfirmSend = (member: any, template: any) => {
    Alert.alert(
      'Confirm Send',
      `Send WhatsApp template "${template.templateName}" to ${member.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            setActionLoading(true);
            try {
              await api.post(`/api/dashboard/inbox/${member.id}/send-template`, {
                templateId: template.id
              });
              Alert.alert('Success', `Template sent successfully to ${member.name}.`);
              setIsSending(false);
              setSelectedTemplate(null);
            } catch (err: any) {
              Alert.alert('Send Failed', err.response?.data?.error || err.message || 'Failed to send template');
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const filteredMembers = members.filter(member => {
    const query = searchQuery.toLowerCase();
    const nameMatch = (member.name || '').toLowerCase().includes(query);
    const phoneMatch = (member.phone || '').includes(query);
    return nameMatch || phoneMatch;
  });

  const fetchTemplates = async () => {
    try {
      const response = await api.get('/api/dashboard/whatsapp/templates');
      setTemplates(response.data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch WhatsApp templates');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await api.post('/api/dashboard/whatsapp/sync-templates');
      await fetchTemplates();
    } catch (err: any) {
      setError(err.message || 'Failed to sync templates from Meta');
      fetchTemplates();
    }
  };

  const handleSelectTemplate = (template: any) => {
    setSelectedTemplate(template);
  };

  const handleSyncTemplateStatus = async (templateId: string) => {
    setActionLoading(true);
    try {
      const response = await api.post(`/api/dashboard/whatsapp/templates/${templateId}/sync-status`);
      const updatedTemplate = response.data;
      setTemplates(prev => prev.map(t => t.id === templateId ? { ...t, status: updatedTemplate.status } : t));
      if (selectedTemplate && selectedTemplate.id === templateId) {
        setSelectedTemplate((prev: any) => prev ? { ...prev, status: updatedTemplate.status } : null);
      }
      Alert.alert('Synced', `Template status synced successfully. New status: ${updatedTemplate.status}`);
    } catch (err: any) {
      Alert.alert('Sync Failed', err.response?.data?.error || err.message || 'Failed to sync status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitDraft = async (templateId: string) => {
    setActionLoading(true);
    try {
      await api.post(`/api/dashboard/whatsapp/templates/${templateId}/submit`);
      Alert.alert('Success', 'Template submitted to Meta successfully! Status is now PENDING.');
      await fetchTemplates();
      setSelectedTemplate(null);
    } catch (err: any) {
      Alert.alert('Submission Failed', err.response?.data?.error || err.message || 'Failed to submit template');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTemplate = (templateId: string) => {
    Alert.alert(
      'Delete Template',
      'Are you sure you want to delete this template? This will delete it locally and on Meta if synced.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await api.delete(`/api/dashboard/whatsapp/templates/${templateId}`);
              setTemplates(prev => prev.filter(t => t.id !== templateId));
              setSelectedTemplate(null);
              Alert.alert('Deleted', 'Template deleted successfully.');
            } catch (err: any) {
              Alert.alert('Delete Failed', err.response?.data?.error || err.message || 'Failed to delete template');
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const getStatusStyle = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'APPROVED' || s === 'ACTIVE') return styles.statusApproved;
    if (s === 'PENDING' || s === 'PENDING_REVIEW') return styles.statusPending;
    if (s === 'DRAFT') return styles.statusDraft;
    return styles.statusRejected;
  };

  const getStatusColor = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'APPROVED' || s === 'ACTIVE') return { color: '#22c55e' };
    if (s === 'PENDING' || s === 'PENDING_REVIEW') return { color: '#eab308' };
    if (s === 'DRAFT') return { color: '#3b82f6' };
    return { color: '#ef4444' };
  };
  const getComponent = (components: any, type: string) => {
    let list: any[] = [];
    try {
      list = typeof components === 'string' ? JSON.parse(components) : components;
    } catch (e) {
      console.error('Failed to parse components:', e);
    }
    return Array.isArray(list) ? list.find((c: any) => c.type === type) : null;
  };

  const renderTemplatePreview = (template: any) => {
    if (!template || !template.components) return null;
    
    const header = getComponent(template.components, 'HEADER');
    const body = getComponent(template.components, 'BODY');
    const footer = getComponent(template.components, 'FOOTER');
    const buttonsComp = getComponent(template.components, 'BUTTONS');

    const timeStr = new Date(template.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <View style={styles.mockChatBody}>
        <View style={styles.mockBubble}>
          <View style={styles.mockBubbleTail} />

          {header && (
            <View style={{ marginBottom: 6 }}>
              {header.format === 'TEXT' ? (
                <Text style={styles.mockBubbleHeader}>{header.text}</Text>
              ) : (
                <View style={{ 
                  backgroundColor: '#1f2c34', 
                  borderRadius: 6, 
                  padding: 12, 
                  alignItems: 'center', 
                  marginBottom: 6,
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.05)'
                }}>
                  <FileText size={24} color="#8696a0" />
                  <Text style={{ color: '#8696a0', fontSize: 11, marginTop: 4, fontWeight: 'bold' }}>
                    Media Header ({header.format})
                  </Text>
                </View>
              )}
            </View>
          )}

          {body && (
            <Text style={styles.mockBubbleBody}>{body.text}</Text>
          )}

          <View style={{ marginTop: 4 }}>
            {footer && (
              <Text style={styles.mockBubbleFooter}>{footer.text}</Text>
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 2 }}>
              <Text style={styles.mockBubbleTime}>{timeStr}</Text>
              <CheckCheck size={13} color="#53bdeb" style={{ marginLeft: 4 }} />
            </View>
          </View>

          {buttonsComp && Array.isArray(buttonsComp.buttons) && buttonsComp.buttons.length > 0 && (
            <View style={styles.mockBubbleButtons}>
              {buttonsComp.buttons.map((btn: any, index: number) => {
                let Icon = MessageSquare;
                if (btn.type === 'URL') Icon = ExternalLink;
                if (btn.type === 'PHONE_NUMBER') Icon = Phone;

                return (
                  <View key={index} style={[styles.mockBubbleBtnItem, index === buttonsComp.buttons.length - 1 && { borderBottomWidth: 0 }]}>
                    <Icon size={12} color="#53bdeb" style={{ marginRight: 6 }} />
                    <Text style={styles.mockBubbleBtnText}>{btn.text}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>
    );
  };

  if (selectedTemplate) {
    if (isSending) {
      return (
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setIsSending(false)} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ArrowLeft size={22} color="#ffffff" style={{ marginRight: 12 }} />
              <Text style={styles.title}>Send Template</Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search member by name or phone..."
              placeholderTextColor="#71717a"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Members List */}
          {membersLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#6366f1" />
            </View>
          ) : (
            <FlatList
              data={filteredMembers}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.memberCard} 
                  onPress={() => handleConfirmSend(item, selectedTemplate)}
                >
                  <View>
                    <Text style={styles.memberName}>{item.name}</Text>
                    <Text style={styles.memberPhone}>{item.phone}</Text>
                  </View>
                  <Send size={16} color="#6366f1" />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No members found.</Text>
                </View>
              }
              contentContainerStyle={styles.listContainer}
            />
          )}
        </View>
      );
    }

    return (
      <View style={styles.container}>
        {/* Detail Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedTemplate(null)} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <ArrowLeft size={22} color="#ffffff" style={{ marginRight: 12 }} />
            <Text style={styles.title} numberOfLines={1}>{selectedTemplate.templateName}</Text>
          </TouchableOpacity>
        </View>

        {/* Scrollable Content */}
        <ScrollView style={styles.detailScroll} contentContainerStyle={styles.detailScrollContent}>
          {/* Section header */}
          <Text style={styles.previewSectionTitle}>WhatsApp Message Preview</Text>
          
          {/* WhatsApp Preview Bubble */}
          {renderTemplatePreview(selectedTemplate)}

          {/* Details Card */}
          <View style={styles.detailCard}>
            <Text style={styles.detailCardTitle}>Template Details</Text>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Category</Text>
              <Text style={styles.detailValue}>{selectedTemplate.category}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Language</Text>
              <Text style={styles.detailValue}>{selectedTemplate.language}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Current Status</Text>
              <View style={[styles.statusChip, getStatusStyle(selectedTemplate.status)]}>
                <Text style={[styles.statusText, getStatusColor(selectedTemplate.status)]}>
                  {selectedTemplate.status}
                </Text>
              </View>
            </View>

            {selectedTemplate.metaTemplateId && (
              <View style={[styles.detailRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                <View style={{ width: '100%' }}>
                  <Text style={styles.detailLabel}>Meta Template ID</Text>
                  <Text style={[styles.detailValue, styles.monospaceText]}>
                    {selectedTemplate.metaTemplateId}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Detail Actions Footer */}
        <View style={styles.previewActionsFooter}>
          {(() => {
            const s = (selectedTemplate.status || '').toUpperCase();
            if (s === 'APPROVED' || s === 'ACTIVE') {
              return (
                <>
                  <TouchableOpacity 
                    style={[styles.actionSubmitBtn, actionLoading && { opacity: 0.5 }]} 
                    onPress={() => handleSendTemplate(selectedTemplate)}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Send size={15} color="#ffffff" style={{ marginRight: 6 }} />
                        <Text style={styles.actionSubmitBtnText}>Send</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionDeleteBtn, actionLoading && { opacity: 0.5 }]} 
                    onPress={() => handleDeleteTemplate(selectedTemplate.id)}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <ActivityIndicator size="small" color="#ef4444" />
                    ) : (
                      <>
                        <Trash2 size={15} color="#ef4444" style={{ marginRight: 6 }} />
                        <Text style={styles.actionDeleteBtnText}>Delete</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              );
            } else if (s === 'PENDING' || s === 'PENDING_REVIEW') {
              return (
                <>
                  <TouchableOpacity 
                    style={[styles.actionSyncBtn, actionLoading && { opacity: 0.5 }]} 
                    onPress={() => handleSyncTemplateStatus(selectedTemplate.id)}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <ActivityIndicator size="small" color="#6366f1" />
                    ) : (
                      <>
                        <RefreshCw size={15} color="#6366f1" style={{ marginRight: 6 }} />
                        <Text style={styles.actionSyncBtnText}>Sync Status</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionDeleteBtn, actionLoading && { opacity: 0.5 }]} 
                    onPress={() => handleDeleteTemplate(selectedTemplate.id)}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <ActivityIndicator size="small" color="#ef4444" />
                    ) : (
                      <>
                        <Trash2 size={15} color="#ef4444" style={{ marginRight: 6 }} />
                        <Text style={styles.actionDeleteBtnText}>Delete</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              );
            } else if (s === 'DRAFT') {
              return (
                <>
                  <TouchableOpacity 
                    style={[styles.actionSubmitBtn, actionLoading && { opacity: 0.5 }]} 
                    onPress={() => handleSubmitDraft(selectedTemplate.id)}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Send size={15} color="#ffffff" style={{ marginRight: 6 }} />
                        <Text style={styles.actionSubmitBtnText}>Submit to Meta</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionDeleteBtn, actionLoading && { opacity: 0.5 }]} 
                    onPress={() => handleDeleteTemplate(selectedTemplate.id)}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <ActivityIndicator size="small" color="#ef4444" />
                    ) : (
                      <>
                        <Trash2 size={15} color="#ef4444" style={{ marginRight: 6 }} />
                        <Text style={styles.actionDeleteBtnText}>Delete</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              );
            } else {
              // Rejected or other error status
              return (
                <TouchableOpacity 
                  style={[styles.actionDeleteBtn, { flex: 1 }, actionLoading && { opacity: 0.5 }]} 
                  onPress={() => handleDeleteTemplate(selectedTemplate.id)}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator size="small" color="#ef4444" />
                  ) : (
                    <>
                      <Trash2 size={15} color="#ef4444" style={{ marginRight: 6 }} />
                      <Text style={styles.actionDeleteBtnText}>Delete Template</Text>
                    </>
                  )}
                </TouchableOpacity>
              );
            }
          })()}
        </View>
      </View>
    );
  }

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
          <Text style={styles.title}>Templates</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <RefreshCw size={18} color="#22c55e" />
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Templates List */}
      <FlatList
        data={templates}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => handleSelectTemplate(item)}>
            <View style={styles.cardHeader}>
              <View style={styles.iconWrapper}>
                <FileText size={18} color="#6366f1" />
              </View>
              <View style={styles.titleContainer}>
                <Text style={styles.templateName}>{item.templateName}</Text>
                <View style={styles.metaRow}>
                  <View style={styles.metaBox}>
                    <Globe size={11} color="#71717a" style={{ marginRight: 4 }} />
                    <Text style={styles.metaText}>{item.language}</Text>
                  </View>
                  <View style={styles.metaBox}>
                    <Layers size={11} color="#71717a" style={{ marginRight: 4 }} />
                    <Text style={styles.metaText}>{item.category}</Text>
                  </View>
                </View>
              </View>
              <View style={[styles.statusChip, getStatusStyle(item.status)]}>
                <Text style={[styles.statusText, getStatusColor(item.status)]}>
                  {item.status}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No templates registered on Meta.</Text>
          </View>
        }
        contentContainerStyle={styles.listContainer}
      />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  refreshButton: {
    padding: 8,
    backgroundColor: '#18181b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 10,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: '#18181b',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
    marginRight: 10,
  },
  templateName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  metaRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  metaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  metaText: {
    fontSize: 11,
    color: '#71717a',
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusApproved: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  statusPending: {
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderColor: 'rgba(234, 179, 8, 0.3)',
  },
  statusRejected: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  statusDraft: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  statusText: {
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
  mockChatHeader: {
    fontSize: 18,
    paddingHorizontal: 4,
  },
  mockChatBody: {
  flex: 1,
    padding: 12,
      justifyContent: 'flex-end',
  },
mockBubble: {
  backgroundColor: '#005c4b', // WhatsApp outbound bubble (green)
    borderRadius: 8,
      padding: 8,
        alignSelf: 'flex-end',
          maxWidth: '90%',
            position: 'relative',
              marginBottom: 4,
  },
mockBubbleTail: {
  position: 'absolute',
    top: 0,
      right: -6,
        width: 0,
          height: 0,
            borderTopWidth: 8,
              borderTopColor: '#005c4b',
                borderRightWidth: 8,
                  borderRightColor: 'transparent',
  },
mockBubbleHeader: {
  color: '#e9edef',
    fontSize: 12,
      fontWeight: 'bold',
        borderBottomWidth: 1,
          borderBottomColor: 'rgba(255, 255, 255, 0.1)',
            paddingBottom: 4,
              marginBottom: 4,
  },
mockBubbleBody: {
  color: '#e9edef',
    fontSize: 12,
      lineHeight: 16,
  },
mockBubbleFooter: {
  color: '#8696a0',
    fontSize: 9,
      marginTop: 4,
  },
mockBubbleTime: {
  color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 9,
      alignSelf: 'flex-end',
        marginTop: 2,
  },
mockBubbleButtons: {
  borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
      marginTop: 6,
        paddingTop: 4,
  },
mockBubbleBtnItem: {
  flexDirection: 'row',
    alignItems: 'center',
      justifyContent: 'center',
        paddingVertical: 6,
          borderBottomWidth: 1,
            borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
mockBubbleBtnText: {
  color: '#53bdeb', // WhatsApp url link blue
    fontSize: 11,
      fontWeight: 'bold',
  },
previewActionsFooter: {
  padding: 16,
    backgroundColor: '#09090b',
      borderTopWidth: 1,
        borderColor: '#18181b',
          flexDirection: 'row',
            gap: 8,
  },
actionSubmitBtn: {
  flex: 2,
    backgroundColor: '#6366f1',
      borderRadius: 10,
        height: 44,
          justifyContent: 'center',
            alignItems: 'center',
  },
actionSubmitBtnText: {
  color: '#ffffff',
    fontSize: 14,
      fontWeight: 'bold',
  },
actionSyncBtn: {
  flex: 2,
    backgroundColor: '#1e1b4b',
      borderWidth: 1,
        borderColor: '#312e81',
          borderRadius: 10,
            height: 44,
              justifyContent: 'center',
                alignItems: 'center',
  },
actionSyncBtnText: {
  color: '#6366f1',
    fontSize: 14,
      fontWeight: 'bold',
  },
actionDeleteBtn: {
  flex: 1.2,
    backgroundColor: '#450a0a',
      borderWidth: 1,
        borderColor: '#7f1d1d',
          borderRadius: 10,
            height: 44,
              justifyContent: 'center',
                alignItems: 'center',
  },
  actionDeleteBtnText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: 'bold',
  },
  detailScroll: {
    flex: 1,
    backgroundColor: '#0f171e',
  },
  detailScrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#27272a',
  },
  detailLabel: {
    fontSize: 13,
    color: '#a1a1aa',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  monospaceText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 4,
  },
  previewSectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#8696a0',
    textTransform: 'uppercase',
    marginBottom: 10,
    textAlign: 'center',
  },
  detailCard: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  detailCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#09090b',
    borderBottomWidth: 1,
    borderColor: '#18181b',
  },
  searchInput: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 10,
    color: '#ffffff',
    paddingHorizontal: 14,
    height: 44,
    fontSize: 14,
  },
  memberCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  memberName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  memberPhone: {
    fontSize: 13,
    color: '#71717a',
    marginTop: 4,
  },
});
