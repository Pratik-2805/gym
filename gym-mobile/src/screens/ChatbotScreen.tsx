import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Bot, Save, BrainCircuit, MessageSquareText, Menu } from 'lucide-react-native';
import { api } from '../lib/api';

interface ChatbotScreenProps {
  onMenuPress?: () => void;
}

export default function ChatbotScreen({ onMenuPress }: ChatbotScreenProps) {
  const [loading, setLoading] = useState(true);
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [isAiModeEnabled, setIsAiModeEnabled] = useState(false);
  const [aiKnowledgeBase, setAiKnowledgeBase] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/api/dashboard/chatbot');
      const settings = response.data.chatbotSettings;
      if (settings) {
        setWelcomeMessage(settings.welcomeMessage || '');
        setIsAiModeEnabled(settings.isAiModeEnabled || false);
        setAiKnowledgeBase(settings.aiKnowledgeBase || '');
      }
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch chatbot settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/api/dashboard/chatbot', {
        welcomeMessage,
        isAiModeEnabled,
        aiKnowledgeBase,
      });
      Alert.alert('Success', 'Chatbot configurations updated successfully!');
      fetchSettings();
    } catch (err: any) {
      Alert.alert('Save Failed', err.message || 'Could not update chatbot configurations');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {onMenuPress && (
            <TouchableOpacity onPress={onMenuPress} style={{ marginRight: 12 }}>
              <Menu size={22} color="#ffffff" />
            </TouchableOpacity>
          )}
          <Text style={styles.title}>Chatbot Configs</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Section title */}
        <View style={styles.sectionHeader}>
          <Bot size={20} color="#6366f1" style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>Greeting & AI Configuration</Text>
        </View>

        {/* Welcome Message Box */}
        <View style={styles.card}>
          <View style={styles.labelRow}>
            <MessageSquareText size={16} color="#a1a1aa" style={{ marginRight: 6 }} />
            <Text style={styles.fieldLabel}>Default Welcome Greeting</Text>
          </View>
          <Text style={styles.fieldDescription}>
            Sent automatically to members when they initiate a new chat session.
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={welcomeMessage}
            onChangeText={setWelcomeMessage}
            placeholder="Welcome to our gym..."
            placeholderTextColor="#71717a"
            multiline={true}
            numberOfLines={4}
          />
        </View>

        {/* AI Mode Switch */}
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <View style={styles.labelRow}>
                <BrainCircuit size={16} color="#a1a1aa" style={{ marginRight: 6 }} />
                <Text style={styles.fieldLabel}>Enable AI Copilot Mode</Text>
              </View>
              <Text style={styles.fieldDescription}>
                Allow Gemini AI to auto-reply to queries based on your knowledge base.
              </Text>
            </View>
            <Switch
              value={isAiModeEnabled}
              onValueChange={setIsAiModeEnabled}
              trackColor={{ false: '#27272a', true: '#818cf8' }}
              thumbColor={isAiModeEnabled ? '#6366f1' : '#a1a1aa'}
            />
          </View>
        </View>

        {/* AI Knowledge Base (conditionally visible or always for reference) */}
        {isAiModeEnabled && (
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>AI Knowledge Base (RAG Context)</Text>
            <Text style={styles.fieldDescription}>
              Include FAQs, gym timings, trainer schedules, subscription prices, etc. AI will formulate answers from this text.
            </Text>
            <TextInput
              style={[styles.input, styles.largeTextArea]}
              value={aiKnowledgeBase}
              onChangeText={setAiKnowledgeBase}
              placeholder="Timings: Mon-Sat 6 AM to 10 PM. Trainers: John (Specialist in Cardio), Sarah (Strength Training)..."
              placeholderTextColor="#71717a"
              multiline={true}
              numberOfLines={8}
            />
          </View>
        )}

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
              <Text style={styles.saveButtonText}>Save Settings</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
  scrollContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
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
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  fieldDescription: {
    fontSize: 12,
    color: '#a1a1aa',
    lineHeight: 18,
    marginBottom: 12,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  input: {
    backgroundColor: '#09090b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    color: '#ffffff',
    paddingHorizontal: 14,
    fontSize: 14,
  },
  textArea: {
    height: 100,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  largeTextArea: {
    height: 160,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
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
