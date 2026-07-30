import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Users, UserCheck, Clock, DollarSign, LogOut, TrendingUp, Menu } from 'lucide-react-native';
import { api, setAuthToken } from '../lib/api';

interface DashboardScreenProps {
  user: any;
  onLogout: () => void;
  onMenuPress: () => void;
}

export default function DashboardScreen({ user, onLogout, onMenuPress }: DashboardScreenProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardStats = async () => {
    try {
      const response = await api.get('/api/dashboard/analytics');
      setData(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard statistics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardStats();
  };

  const handleLogout = async () => {
    await setAuthToken(null);
    onLogout();
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  const summary = data?.summary || {
    totalMembers: 0,
    activeMembers: 0,
    expiredMembers: 0,
    totalRevenue: 0,
    conversionRate: 0,
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onMenuPress} style={styles.menuButton}>
          <Menu size={22} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.welcomeText}>Hello, {user?.name || 'Owner'}</Text>
          <Text style={styles.gymText}>{user?.gym?.name || 'Your Gym'}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <LogOut size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
        }
      >
        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Stats Grid */}
        <View style={styles.grid}>
          <View style={styles.card}>
            <View style={[styles.iconWrapper, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
              <Users size={22} color="#6366f1" />
            </View>
            <Text style={styles.cardValue}>{summary.totalMembers}</Text>
            <Text style={styles.cardLabel}>Total Members</Text>
          </View>

          <View style={styles.card}>
            <View style={[styles.iconWrapper, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
              <UserCheck size={22} color="#22c55e" />
            </View>
            <Text style={styles.cardValue}>{summary.activeMembers}</Text>
            <Text style={styles.cardLabel}>Active Members</Text>
          </View>

          <View style={styles.card}>
            <View style={[styles.iconWrapper, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
              <Clock size={22} color="#ef4444" />
            </View>
            <Text style={styles.cardValue}>{summary.expiredMembers}</Text>
            <Text style={styles.cardLabel}>Expired Members</Text>
          </View>

          <View style={styles.card}>
            <View style={[styles.iconWrapper, { backgroundColor: 'rgba(234, 179, 8, 0.15)' }]}>
              <DollarSign size={22} color="#eab308" />
            </View>
            <Text style={styles.cardValue}>₹{summary.totalRevenue.toLocaleString()}</Text>
            <Text style={styles.cardLabel}>Total Revenue</Text>
          </View>
        </View>

        {/* Additional Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conversion Rate</Text>
          <View style={styles.conversionCard}>
            <TrendingUp size={24} color="#6366f1" style={{ marginRight: 12 }} />
            <View>
              <Text style={styles.conversionValue}>{summary.conversionRate}%</Text>
              <Text style={styles.conversionLabel}>Of total registered users have plans</Text>
            </View>
          </View>
        </View>

        {/* Recent Registered Members */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Members</Text>
          {data?.membersList?.slice(0, 5).map((member: any) => (
            <View key={member.id} style={styles.memberRow}>
              <View>
                <Text style={styles.memberName}>{member.name}</Text>
                <Text style={styles.memberPhone}>{member.phone}</Text>
              </View>
              <View style={[
                styles.statusChip,
                member.status === 'ACTIVE' ? styles.statusActive : styles.statusExpired
              ]}>
                <Text style={[
                  styles.statusText,
                  member.status === 'ACTIVE' ? { color: '#22c55e' } : { color: '#ef4444' }
                ]}>
                  {member.status}
                </Text>
              </View>
            </View>
          ))}
          {(!data?.membersList || data.membersList.length === 0) && (
            <Text style={styles.emptyText}>No members registered yet.</Text>
          )}
        </View>
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
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderColor: '#18181b',
    backgroundColor: '#09090b',
  },
  welcomeText: {
    fontSize: 14,
    color: '#a1a1aa',
  },
  gymText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 2,
  },
  menuButton: {
    padding: 10,
    backgroundColor: '#18181b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  logoutButton: {
    padding: 10,
    backgroundColor: '#18181b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  scrollContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 12,
    color: '#a1a1aa',
  },
  section: {
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  conversionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  conversionValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  conversionLabel: {
    fontSize: 12,
    color: '#a1a1aa',
    marginTop: 2,
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  memberPhone: {
    fontSize: 13,
    color: '#71717a',
    marginTop: 2,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
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
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#71717a',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
});
