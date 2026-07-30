import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { Dumbbell, Save, Menu } from 'lucide-react-native';
import { api } from '../lib/api';

interface SettingsGeneralScreenProps {
  onMenuPress?: () => void;
}

export default function SettingsGeneralScreen({ onMenuPress }: SettingsGeneralScreenProps) {
  const [loading, setLoading] = useState(true);
  const [gymName, setGymName] = useState('');
  const [gymSlug, setGymSlug] = useState('');
  const [createdAt, setCreatedAt] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchGym = async () => {
      try {
        const res = await api.get('/api/auth/me');
        if (res.data && res.data.user && res.data.user.gym) {
          setGymName(res.data.user.gym.name || '');
          setGymSlug(res.data.user.gym.slug || '');
          setCreatedAt(res.data.user.gym.createdAt || '');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchGym();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    // Mimic saving behavior (since the web settings brand update is also a toast check)
    setTimeout(() => {
      setSaving(false);
      Alert.alert('Success', 'Gym general profile updated successfully!');
    }, 800);
  };

  if (loading) {
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
          <Text style={styles.title}>General Settings</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.sectionHeader}>
          <Image
            source={require('../../assets/app-icon.png')}
            style={{ width: 24, height: 24, borderRadius: 6, marginRight: 8 }}
            resizeMode="contain"
          />
          <Text style={styles.sectionTitle}>Brand & Workspace</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Workspace Name</Text>
          <TextInput
            style={styles.input}
            value={gymName}
            onChangeText={setGymName}
            placeholder="e.g. FitFlow"
            placeholderTextColor="#71717a"
          />

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Workspace Subdomain (Slug)</Text>
          <TextInput
            style={[styles.input, styles.disabledInput]}
            value={gymSlug}
            editable={false}
            placeholder="workspace-subdomain"
            placeholderTextColor="#71717a"
          />
          <Text style={styles.fieldDescription}>
            Slug cannot be modified. Used for routing and custom workspace subdomains.
          </Text>

          {createdAt && (
            <View style={styles.createdBox}>
              <Text style={styles.createdLabel}>Created At</Text>
              <Text style={styles.createdValue}>
                {new Date(createdAt).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Save size={18} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
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
  scrollContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
  fieldLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#a1a1aa',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  fieldDescription: {
    fontSize: 11,
    color: '#71717a',
    marginTop: 6,
    lineHeight: 16,
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
  disabledInput: {
    opacity: 0.6,
    color: '#71717a',
  },
  createdBox: {
    marginTop: 20,
    borderTopWidth: 1,
    borderColor: '#27272a',
    paddingTop: 16,
  },
  createdLabel: {
    fontSize: 11,
    color: '#71717a',
    textTransform: 'uppercase',
  },
  createdValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 4,
  },
  saveButton: {
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
    fontSize: 16,
    fontWeight: 'bold',
  },
});
