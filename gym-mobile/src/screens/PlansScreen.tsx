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
import { Plus, Clock, Tag, CreditCard, X, Award, Menu } from 'lucide-react-native';
import { api } from '../lib/api';

interface PlansScreenProps {
  onMenuPress?: () => void;
}

export default function PlansScreen({ onMenuPress }: PlansScreenProps) {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add Plan Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchPlans = async () => {
    try {
      const response = await api.get('/api/dashboard/plans');
      setPlans(response.data.plans || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch membership plans');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPlans();
  };

  const handleAddPlan = async () => {
    if (!name || !price || !duration) {
      Alert.alert('Required Fields', 'Please fill in Name, Price, and Duration.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/api/dashboard/plans', {
        name,
        price: Number(price),
        durationDays: Number(duration),
        description,
      });
      Alert.alert('Success', 'Plan created successfully!');
      setModalVisible(false);
      setName('');
      setPrice('');
      setDuration('');
      setDescription('');
      fetchPlans();
    } catch (err: any) {
      Alert.alert('Failed to Create Plan', err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

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
          <Text style={styles.title}>Membership Plans</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
          <Plus size={20} color="#ffffff" style={{ marginRight: 4 }} />
          <Text style={styles.addButtonText}>New Plan</Text>
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Plans List */}
      <FlatList
        data={plans}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const memberships = item.memberships || [];
          const activeSubscribers = memberships.filter((m: any) => m.status === 'ACTIVE').length;

          return (
            <View style={styles.planCard}>
              <View style={styles.cardHeader}>
                <View style={styles.planBadge}>
                  <Award size={18} color="#eab308" />
                </View>
                <View style={styles.planNameContainer}>
                  <Text style={styles.planName}>{item.name}</Text>
                  <Text style={styles.planDescription} numberOfLines={2}>
                    {item.description || 'No description provided'}
                  </Text>
                </View>
              </View>

              <View style={styles.statsContainer}>
                <View style={styles.statBox}>
                  <CreditCard size={14} color="#a1a1aa" style={{ marginRight: 6 }} />
                  <Text style={styles.statLabel}>Price: </Text>
                  <Text style={styles.statValue}>₹{item.price.toLocaleString()}</Text>
                </View>

                <View style={styles.statBox}>
                  <Clock size={14} color="#a1a1aa" style={{ marginRight: 6 }} />
                  <Text style={styles.statLabel}>Duration: </Text>
                  <Text style={styles.statValue}>{item.durationDays} Days</Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <Tag size={14} color="#6366f1" style={{ marginRight: 6 }} />
                <Text style={styles.activeLabel}>
                  Active Members: <Text style={styles.activeValue}>{activeSubscribers}</Text>
                </Text>
              </View>
            </View>
          );
        }}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No membership plans created yet.</Text>
          </View>
        }
        contentContainerStyle={styles.listContainer}
      />

      {/* Add Plan Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Plan</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                <X size={20} color="#a1a1aa" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalForm}>
              <Text style={styles.fieldLabel}>Plan Name *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Monthly Premium"
                placeholderTextColor="#71717a"
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.fieldLabel}>Price (₹) *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 1499"
                placeholderTextColor="#71717a"
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
              />

              <Text style={styles.fieldLabel}>Duration (Days) *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 30"
                placeholderTextColor="#71717a"
                value={duration}
                onChangeText={setDuration}
                keyboardType="numeric"
              />

              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={[styles.modalInput, styles.textArea]}
                placeholder="Details about plan access, services, etc..."
                placeholderTextColor="#71717a"
                value={description}
                onChangeText={setDescription}
                multiline={true}
                numberOfLines={3}
              />

              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleAddPlan}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitButtonText}>Create Plan</Text>
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
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 10,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 30,
  },
  planCard: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  planBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  planNameContainer: {
    flex: 1,
  },
  planName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  planDescription: {
    fontSize: 13,
    color: '#a1a1aa',
    marginTop: 4,
    lineHeight: 18,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#09090b',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'space-between',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  statBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#71717a',
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 4,
  },
  activeLabel: {
    fontSize: 13,
    color: '#a1a1aa',
  },
  activeValue: {
    color: '#22c55e',
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
    maxHeight: '85%',
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
  textArea: {
    height: 80,
    paddingTop: 12,
    textAlignVertical: 'top',
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
