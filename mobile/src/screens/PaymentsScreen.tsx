import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { apiRequest } from '../services/api';

interface PaymentsScreenProps {
  gymSlug: string;
}

interface TransactionItem {
  id: string;
  amount: number;
  status: string;
  paymentMode: string;
  referenceId: string | null;
  createdAt: string;
  member: {
    name: string;
    phone: string;
  };
  plan: {
    name: string;
  };
}

export default function PaymentsScreen({ gymSlug }: PaymentsScreenProps) {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);

  const fetchTransactions = async () => {
    try {
      const res = await apiRequest(`/api/dashboard/${gymSlug}/payments`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [gymSlug]);

  const handleVerifyPayment = async (txnId: string, approve: boolean) => {
    const action = approve ? 'APPROVE' : 'REJECT';
    
    if (approve) {
      Alert.alert(
        'Verify Payment',
        'Approve this manual UPI transaction and activate their membership instantly?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Confirm & Approve', onPress: () => runVerify(txnId, action) },
        ]
      );
    } else {
      Alert.prompt(
        'Reject Payment',
        'Please enter a reason for rejecting this payment request:',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Confirm Reject', onPress: (reason) => runVerify(txnId, action, reason || 'Transaction invalid') },
        ]
      );
    }
  };

  const runVerify = async (txnId: string, action: 'APPROVE' | 'REJECT', reason?: string) => {
    setActiveActionId(txnId);
    try {
      const res = await apiRequest(`/api/dashboard/${gymSlug}/payments`, {
        method: 'POST',
        body: JSON.stringify({
          transactionId: txnId,
          action,
          reason,
        }),
      });

      if (res.ok) {
        await fetchTransactions();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActiveActionId(null);
    }
  };

  const pendingTxns = transactions.filter((t) => t.status === 'AWAITING_VERIFICATION');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>UPI Payments Portal</Text>
        <Text style={styles.subtitle}>Verify and approve manual transactions</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#06b6d4" size="large" />
        </View>
      ) : (
        <FlatList
          data={pendingTxns}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.paymentCard}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.memberName}>{item.member.name}</Text>
                  <Text style={styles.memberPhone}>{item.member.phone}</Text>
                </View>
                <Text style={styles.amount}>₹{item.amount}</Text>
              </View>

              <View style={styles.detailsBox}>
                <View style={styles.row}>
                  <Text style={styles.detailLabel}>PLAN:</Text>
                  <Text style={styles.detailVal}>{item.plan.name}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.detailLabel}>TXN REF ID:</Text>
                  <Text style={[styles.detailVal, styles.refId]}>{item.referenceId}</Text>
                </View>
              </View>

              {/* Action buttons */}
              {activeActionId === item.id ? (
                <View style={styles.actionLoader}>
                  <ActivityIndicator color="#06b6d4" size="small" />
                </View>
              ) : (
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.approveBtn]}
                    onPress={() => handleVerifyPayment(item.id, true)}
                  >
                    <Text style={styles.actionBtnText}>Approve</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.rejectBtn]}
                    onPress={() => handleVerifyPayment(item.id, false)}
                  >
                    <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Reject</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>✓</Text>
              <Text style={styles.emptyText}>All caught up! No pending UPI approvals.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: '#18181b',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 11,
    color: '#71717a',
    marginTop: 2,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  paymentCard: {
    backgroundColor: '#18181b',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  memberName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  memberPhone: {
    fontSize: 11,
    color: '#52525b',
    marginTop: 4,
    fontWeight: '600',
  },
  amount: {
    fontSize: 18,
    fontWeight: '900',
    color: '#06b6d4',
  },
  detailsBox: {
    backgroundColor: '#09090b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 12,
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#71717a',
  },
  detailVal: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#e4e4e7',
  },
  refId: {
    color: '#10b981',
    fontFamily: 'monospace',
  },
  actionLoader: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveBtn: {
    backgroundColor: '#10b981',
  },
  rejectBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 32,
    color: '#10b981',
    marginBottom: 12,
  },
  emptyText: {
    color: '#52525b',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 200,
    lineHeight: 18,
  },
});
