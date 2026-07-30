import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { CreditCard, DollarSign, Calendar, RefreshCw, Smartphone, Menu } from 'lucide-react-native';
import { api } from '../lib/api';

interface PaymentsScreenProps {
  onMenuPress?: () => void;
}

export default function PaymentsScreen({ onMenuPress }: PaymentsScreenProps) {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = async () => {
    try {
      const response = await api.get('/api/dashboard/payments');
      setPayments(response.data.transactions || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch transaction logs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPayments();
  };

  const formatDate = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
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
          <Text style={styles.title}>Payments</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <RefreshCw size={18} color="#a1a1aa" />
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Transaction List */}
      <FlatList
        data={payments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isPaid = item.status === 'PAID';
          const isPending = item.status === 'PENDING' || item.status === 'AWAITING_VERIFICATION';
          const isFailed = item.status === 'FAILED' || item.status === 'REJECTED';

          return (
            <View style={styles.paymentCard}>
              <View style={styles.cardHeader}>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{item.member?.memberName || 'Unnamed Member'}</Text>
                  <Text style={styles.memberPhone}>{item.member?.phone}</Text>
                </View>
                <View style={[
                  styles.statusChip,
                  isPaid ? styles.statusPaid : isPending ? styles.statusPending : styles.statusFailed
                ]}>
                  <Text style={[
                    styles.statusText,
                    isPaid ? { color: '#22c55e' } : isPending ? { color: '#eab308' } : { color: '#ef4444' }
                  ]}>
                    {item.status}
                  </Text>
                </View>
              </View>

              <View style={styles.planInfo}>
                <Text style={styles.planLabel}>Plan Selected</Text>
                <Text style={styles.planName}>{item.plan?.name || 'Custom Subscription'}</Text>
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.amountBox}>
                  <DollarSign size={16} color="#6366f1" />
                  <Text style={styles.amountText}>₹{item.amount.toLocaleString()}</Text>
                </View>

                <View style={styles.infoRow}>
                  {item.paymentMode === 'RAZORPAY' ? (
                    <CreditCard size={13} color="#71717a" style={{ marginRight: 4 }} />
                  ) : (
                    <Smartphone size={13} color="#71717a" style={{ marginRight: 4 }} />
                  )}
                  <Text style={styles.infoText}>{item.paymentMode}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Calendar size={13} color="#71717a" style={{ marginRight: 4 }} />
                  <Text style={styles.infoText}>{formatDate(item.createdAt)}</Text>
                </View>
              </View>

              {item.referenceId && (
                <View style={styles.refRow}>
                  <Text style={styles.refLabel}>Ref ID:</Text>
                  <Text style={styles.refValue} numberOfLines={1}>{item.referenceId}</Text>
                </View>
              )}
            </View>
          );
        }}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No payment history recorded.</Text>
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
  paymentCard: {
    backgroundColor: '#18181b',
    borderRadius: 16,
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
    flex: 1,
    marginRight: 10,
  },
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  memberPhone: {
    fontSize: 12,
    color: '#a1a1aa',
    marginTop: 2,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusPaid: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  statusPending: {
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderColor: 'rgba(234, 179, 8, 0.3)',
  },
  statusFailed: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  planInfo: {
    marginBottom: 16,
  },
  planLabel: {
    fontSize: 11,
    color: '#71717a',
    textTransform: 'uppercase',
  },
  planName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: '#27272a',
  },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 12,
    color: '#a1a1aa',
  },
  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: '#09090b',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  refLabel: {
    fontSize: 11,
    color: '#71717a',
    marginRight: 6,
  },
  refValue: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#a1a1aa',
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#71717a',
    fontSize: 15,
  },
});
