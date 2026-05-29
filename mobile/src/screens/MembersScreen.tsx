import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { apiRequest } from '../services/api';

interface MembersScreenProps {
  gymSlug: string;
}

interface MemberItem {
  id: string;
  name: string;
  phone: string;
  isBotDisabled: boolean;
  memberships: Array<{
    status: string;
    plan: {
      name: string;
    };
  }>;
}

export default function MembersScreen({ gymSlug }: MembersScreenProps) {
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeToggleId, setActiveToggleId] = useState<string | null>(null);

  const fetchMembers = async () => {
    try {
      const res = await apiRequest(`/api/dashboard/${gymSlug}/members`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [gymSlug]);

  const handleToggleBot = async (memberId: string, currentBotState: boolean) => {
    setActiveToggleId(memberId);
    const newState = !currentBotState;

    try {
      const res = await apiRequest(`/api/dashboard/${gymSlug}/members/${memberId}/toggle-bot`, {
        method: 'POST',
        body: JSON.stringify({ isBotDisabled: newState }),
      });

      if (res.ok) {
        setMembers((prev) =>
          prev.map((m) => (m.id === memberId ? { ...m, isBotDisabled: newState } : m))
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActiveToggleId(null);
    }
  };

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.phone.includes(searchQuery)
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Members Directory</Text>
        <Text style={styles.subtitle}>Direct live chatbot takeover options</Text>
      </View>

      {/* Search Box */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or number..."
          placeholderTextColor="#52525b"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#06b6d4" size="large" />
        </View>
      ) : (
        <FlatList
          data={filteredMembers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const activeSub = item.memberships.find((s) => s.status === 'ACTIVE');
            return (
              <View style={styles.memberCard}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.memberName}>{item.name}</Text>
                    <Text style={styles.memberPhone}>{item.phone}</Text>
                  </View>
                  <View style={styles.badgeContainer}>
                    {activeSub ? (
                      <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>{activeSub.plan.name}</Text>
                      </View>
                    ) : (
                      <View style={styles.inactiveBadge}>
                        <Text style={styles.inactiveBadgeText}>No active plan</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Takeover Actions */}
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      item.isBotDisabled ? styles.takeoverBtn : styles.botActiveBtn,
                    ]}
                    onPress={() => handleToggleBot(item.id, item.isBotDisabled)}
                    disabled={activeToggleId === item.id}
                  >
                    {activeToggleId === item.id ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <Text style={styles.toggleBtnText}>
                        {item.isBotDisabled ? '🛑 Chatbot Paused (Human)' : '🤖 Chatbot Active'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No members found.</Text>
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
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  searchInput: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  memberCard: {
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
    marginBottom: 16,
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
  badgeContainer: {
    alignItems: 'flex-end',
  },
  activeBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  activeBadgeText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: 'bold',
  },
  inactiveBadge: {
    backgroundColor: 'rgba(82, 82, 91, 0.1)',
    borderColor: 'rgba(82, 82, 91, 0.2)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  inactiveBadgeText: {
    color: '#a1a1aa',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardActions: {
    borderTopWidth: 1,
    borderColor: '#27272a',
    paddingTop: 12,
  },
  toggleButton: {
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  takeoverBtn: {
    backgroundColor: '#ef4444',
  },
  botActiveBtn: {
    backgroundColor: '#27272a',
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  toggleBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#52525b',
    fontSize: 12,
    fontWeight: '600',
  },
});
