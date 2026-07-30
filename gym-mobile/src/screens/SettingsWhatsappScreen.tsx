import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { Settings, CheckCircle2, AlertTriangle, ShieldCheck, Link2, Info, Menu, Save, RefreshCw, Trash2 } from 'lucide-react-native';
import { api, getBackendUrl } from '../lib/api';

interface SettingsWhatsappScreenProps {
  onMenuPress?: () => void;
}

export default function SettingsWhatsappScreen({ onMenuPress }: SettingsWhatsappScreenProps) {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [wabaId, setWabaId] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [accessToken, setAccessToken] = useState('');

  const fetchStatus = async (forceMeta: boolean = false) => {
    console.log(`[WhatsApp Setup Status] Fetching connection status from backend (forceMeta: ${forceMeta})...`);
    try {
      const query = forceMeta ? '?forceMetaCheck=true' : '';
      const response = await api.get(`/api/dashboard/whatsapp/status${query}`);
      console.log('[WhatsApp Setup Status] Status retrieved successfully:', response.data);
      setStatus(response.data);
      
      // Prefill fields
      if (response.data) {
        console.log('[WhatsApp Setup Status] Setting local state from retrieved status data:', {
          wabaId: response.data.wabaId,
          phoneNumberId: response.data.phoneNumberId,
          connected: response.data.connected,
        });
        setWabaId(response.data.wabaId || '');
        setPhoneNumberId(response.data.phoneNumberId || '');
      }
    } catch (err: any) {
      console.error('[WhatsApp Setup Status] Failed to fetch status from backend:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    console.log('[WhatsApp Setup Screen] Component mounted.');
    fetchStatus();
  }, []);

  const onRefresh = () => {
    console.log('[WhatsApp Setup Status] Manual refresh triggered.');
    setRefreshing(true);
    fetchStatus(true);
  };

  const handleConnect = async () => {
    console.log('[WhatsApp Setup] Initializing connection request...');
    console.log('[WhatsApp Setup] Parameters: ', {
      wabaId,
      phoneNumberId,
      accessToken: accessToken ? `${accessToken.substring(0, 10)}... (length: ${accessToken.length})` : 'EMPTY',
      backendUrl: getBackendUrl(),
    });

    if (!wabaId || !phoneNumberId || (!status?.connected && !accessToken)) {
      const errorMsg = 'Validation failed: WABA ID, Phone ID, or Access Token is missing.';
      console.warn(`[WhatsApp Setup] ${errorMsg}`);
      Alert.alert('Required Fields', errorMsg);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        wabaId,
        phoneNumberId,
        accessToken,
        businessId: wabaId, // automatically set to WABA ID
      };

      console.log('[WhatsApp Setup] Sending POST request to backend...');
      const response = await api.post('/api/dashboard/whatsapp/connect', payload);
      console.log('[WhatsApp Setup] Backend connection response received:', response.data);

      Alert.alert(
        'Success', 
        `WhatsApp connected successfully!\nResponse: ${JSON.stringify(response.data)}`
      );
      setIsEditing(false);
      
      console.log('[WhatsApp Setup] Re-fetching status from backend...');
      await fetchStatus();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Setup connection failed.';
      console.error('[WhatsApp Setup] Connection request threw an exception:', err);
      console.error('[WhatsApp Setup] Error message detail:', errorMsg);
      
      Alert.alert(
        'Connection Failed',
        `Error: ${errorMsg}\n\nCheck console log or server log for detailed error response.`
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Confirm Disconnection',
      'Are you sure you want to disconnect WhatsApp Business? This will disable all automated reminders.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              await api.post('/api/dashboard/whatsapp/disconnect');
              Alert.alert('Disconnected', 'WhatsApp integration disabled.');
              setIsEditing(false);
              fetchStatus();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to disconnect.');
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  const isConnected = status?.connected || false;

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
          <Text style={styles.title}>WhatsApp Setup</Text>
        </View>
        {isConnected && !isEditing && (
          <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
            <RefreshCw size={18} color="#a1a1aa" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Connection Status Panel */}
        <View style={styles.sectionHeader}>
          <Link2 size={18} color="#6366f1" style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>Meta Cloud Integration</Text>
        </View>

        <View style={[styles.card, styles.statusCard]}>
          <View style={styles.statusRow}>
            {isConnected ? (
              <CheckCircle2 size={32} color="#22c55e" style={{ marginRight: 16 }} />
            ) : (
              <AlertTriangle size={32} color="#eab308" style={{ marginRight: 16 }} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.statusLabel}>WhatsApp API Connection</Text>
              <Text style={styles.statusState}>
                {isConnected ? 'Active & Running' : 'Pending Setup / Disconnected'}
              </Text>
            </View>
          </View>
          {isConnected && !isEditing && (
            <View style={styles.statusActionRow}>
              <TouchableOpacity style={styles.editBtn} onPress={() => setIsEditing(true)}>
                <Text style={styles.editBtnText}>Edit Credentials</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.disconnectBtn} onPress={handleDisconnect}>
                <Trash2 size={15} color="#ef4444" style={{ marginRight: 6 }} />
                <Text style={styles.disconnectBtnText}>Disconnect</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Configuration Setup Form */}
        {(!isConnected || isEditing) ? (
          <View style={styles.formContainer}>
            <View style={styles.sectionHeader}>
              <Settings size={18} color="#6366f1" style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>Configure Meta Access Credentials</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.fieldLabel}>WABA ID (WhatsApp Business Account)</Text>
              <TextInput
                style={styles.input}
                value={wabaId}
                onChangeText={setWabaId}
                placeholder="e.g. 1093847291038"
                placeholderTextColor="#71717a"
                keyboardType="numeric"
              />

              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Phone Number ID</Text>
              <TextInput
                style={styles.input}
                value={phoneNumberId}
                onChangeText={setPhoneNumberId}
                placeholder="e.g. 1093847291038"
                placeholderTextColor="#71717a"
                keyboardType="numeric"
              />

              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Meta System Access Token</Text>
              <TextInput
                style={styles.input}
                value={accessToken}
                onChangeText={setAccessToken}
                placeholder="EAAGd..."
                placeholderTextColor="#71717a"
                secureTextEntry={true}
              />

            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleConnect}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Save size={18} color="#ffffff" style={{ marginRight: 8 }} />
                    <Text style={styles.saveButtonText}>Connect Credentials</Text>
                  </>
                )}
              </TouchableOpacity>

              {isEditing && (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setIsEditing(false)}
                  disabled={saving}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.detailsContainer}>
            {/* Credentials / Details Panel */}
            <View style={styles.sectionHeader}>
              <Info size={18} color="#6366f1" style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>Connection Parameters</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.infoField}>
                <Text style={styles.infoLabel}>Display Phone Number</Text>
                <Text style={styles.infoValue}>{status?.whatsappDisplayPhoneNumber || 'Not Configured'}</Text>
              </View>

              <View style={styles.infoField}>
                <Text style={styles.infoLabel}>Verified Name</Text>
                <Text style={styles.infoValue}>{status?.whatsappVerifiedName || 'Not Verified'}</Text>
              </View>

              <View style={styles.infoField}>
                <Text style={styles.infoLabel}>Messaging Limit Tier</Text>
                <Text style={styles.infoValue}>{status?.whatsappMessagingTier || 'Tier 0 / Unregistered'}</Text>
              </View>

              <View style={styles.infoField}>
                <Text style={styles.infoLabel}>Quality Rating</Text>
                <Text style={[
                  styles.infoValue,
                  status?.whatsappQualityRating === 'GREEN' ? { color: '#22c55e' } : { color: '#a1a1aa' }
                ]}>
                  {status?.whatsappQualityRating || 'Unknown'}
                </Text>
              </View>
            </View>

          </View>
        )}
      </ScrollView>
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
    fontSize: 22,
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
  scrollContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  card: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  statusCard: {
    paddingVertical: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 12,
    color: '#a1a1aa',
    textTransform: 'uppercase',
  },
  statusState: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 4,
  },
  statusActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderColor: '#27272a',
    marginTop: 16,
    paddingTop: 16,
  },
  editBtn: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderColor: 'rgba(99, 102, 241, 0.3)',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 12,
  },
  editBtnText: {
    color: '#818cf8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  disconnectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  disconnectBtnText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: 'bold',
  },
  formContainer: {
    marginTop: 10,
  },
  detailsContainer: {
    marginTop: 10,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#a1a1aa',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#09090b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    color: '#ffffff',
    paddingHorizontal: 14,
    height: 48,
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#6366f1',
    borderRadius: 12,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  cancelButton: {
    marginLeft: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    height: 52,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#18181b',
  },
  cancelButtonText: {
    color: '#a1a1aa',
    fontSize: 15,
    fontWeight: 'bold',
  },
  infoField: {
    borderBottomWidth: 1,
    borderColor: '#27272a',
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#71717a',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  idField: {
    marginBottom: 14,
  },
  idLabel: {
    fontSize: 12,
    color: '#71717a',
    marginBottom: 4,
  },
  idValue: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#a1a1aa',
    backgroundColor: '#09090b',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#27272a',
  },
});
