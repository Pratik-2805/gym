import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { Search, UserPlus, Phone, MapPin, X, User, Menu } from 'lucide-react-native';
import { api } from '../lib/api';

interface MembersScreenProps {
  onMenuPress?: () => void;
}

export default function MembersScreen({ onMenuPress }: MembersScreenProps) {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [plans, setPlans] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add Member Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [membersRes, plansRes] = await Promise.all([
        api.get('/api/dashboard/members'),
        api.get('/api/dashboard/plans'),
      ]);
      setMembers(membersRes.data.members || []);
      setPlans(plansRes.data.plans || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch directory data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleAddMember = async () => {
    if (!name || !phone) {
      Alert.alert('Required Fields', 'Please enter at least name and phone number.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/api/dashboard/members', {
        name,
        phone,
        address,
        emergencyContact,
      });
      Alert.alert('Success', 'Member registered successfully!');
      setModalVisible(false);
      setName('');
      setPhone('');
      setAddress('');
      setEmergencyContact('');
      fetchData();
    } catch (err: any) {
      Alert.alert('Registration Failed', err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getMemberStatus = (member: any) => {
    const memberships = member.memberships || [];
    const hasActive = memberships.some((m: any) => m.status === 'ACTIVE');
    if (hasActive) return 'ACTIVE';
    if (memberships.length > 0) return 'EXPIRED';
    return 'NONE';
  };

  const getActivePlanName = (member: any) => {
    const activeSub = member.memberships?.find((m: any) => m.status === 'ACTIVE');
    if (!activeSub) return 'No Active Plan';
    const plan = plans.find(p => p.id === activeSub.planId);
    return plan ? plan.name : 'Unknown Plan';
  };

  const filteredMembers = members.filter((member: any) => {
    const memberName = (member.memberName || member.name || '').toLowerCase();
    const memberPhone = (member.phone || '');
    const query = search.toLowerCase();
    return memberName.includes(query) || memberPhone.includes(query);
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
          <Text style={styles.title}>Members</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
          <UserPlus size={20} color="#ffffff" style={{ marginRight: 6 }} />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={18} color="#71717a" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or phone..."
          placeholderTextColor="#71717a"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Members List */}
      <FlatList
        data={filteredMembers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const status = getMemberStatus(item);
          const planName = getActivePlanName(item);

          return (
            <View style={styles.memberCard}>
              <View style={styles.cardHeader}>
                <View style={styles.memberInfo}>
                  <View style={styles.avatar}>
                    <User size={20} color="#6366f1" />
                  </View>
                  <View>
                    <Text style={styles.memberName}>{item.memberName || item.name || 'Unnamed'}</Text>
                    <View style={styles.iconTextRow}>
                      <Phone size={12} color="#71717a" style={{ marginRight: 4 }} />
                      <Text style={styles.memberPhone}>{item.phone}</Text>
                    </View>
                  </View>
                </View>
                <View style={[
                  styles.statusChip,
                  status === 'ACTIVE' ? styles.statusActive : status === 'EXPIRED' ? styles.statusExpired : styles.statusNone
                ]}>
                  <Text style={[
                    styles.statusText,
                    status === 'ACTIVE' ? { color: '#22c55e' } : status === 'EXPIRED' ? { color: '#ef4444' } : { color: '#71717a' }
                  ]}>
                    {status}
                  </Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.planLabel}>Plan: <Text style={styles.planName}>{planName}</Text></Text>
                {item.address && (
                  <View style={styles.iconTextRow}>
                    <MapPin size={12} color="#71717a" style={{ marginRight: 4 }} />
                    <Text style={styles.memberAddress} numberOfLines={1}>{item.address}</Text>
                  </View>
                )}
              </View>
            </View>
          );
        }}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No members found</Text>
          </View>
        }
        contentContainerStyle={styles.listContainer}
      />

      {/* Add Member Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Member</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                <X size={20} color="#a1a1aa" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalForm}>
              <Text style={styles.fieldLabel}>Full Name *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="John Doe"
                placeholderTextColor="#71717a"
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.fieldLabel}>WhatsApp Phone Number *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 919876543210"
                placeholderTextColor="#71717a"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />

              <Text style={styles.fieldLabel}>Address</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Street address, city"
                placeholderTextColor="#71717a"
                value={address}
                onChangeText={setAddress}
              />

              <Text style={styles.fieldLabel}>Emergency Contact</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Contact Name & Number"
                placeholderTextColor="#71717a"
                value={emergencyContact}
                onChangeText={setEmergencyContact}
              />

              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleAddMember}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitButtonText}>Register Member</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
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
  memberCard: {
    backgroundColor: '#18181b',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderColor: '#27272a',
    paddingBottom: 12,
    marginBottom: 12,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  memberPhone: {
    fontSize: 13,
    color: '#a1a1aa',
  },
  iconTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  statusExpired: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  statusNone: {
    backgroundColor: 'rgba(113, 113, 122, 0.1)',
    borderColor: 'rgba(113, 113, 122, 0.3)',
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planLabel: {
    fontSize: 13,
    color: '#71717a',
  },
  planName: {
    color: '#eab308',
    fontWeight: '500',
  },
  memberAddress: {
    fontSize: 12,
    color: '#71717a',
    maxWidth: 150,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#71717a',
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#18181b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '80%',
    borderTopWidth: 1,
    borderColor: '#27272a',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: '#27272a',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  closeButton: {
    padding: 4,
  },
  modalForm: {
    padding: 24,
  },
  fieldLabel: {
    fontSize: 14,
    color: '#a1a1aa',
    marginBottom: 8,
    fontWeight: '500',
  },
  modalInput: {
    backgroundColor: '#09090b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    height: 48,
    color: '#ffffff',
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
