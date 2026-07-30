import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { Mail, Lock, Eye, EyeOff, Dumbbell } from 'lucide-react-native';
import { api, setAuthToken } from '../lib/api';

interface LoginScreenProps {
  onLoginSuccess: (user: any) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post('/api/auth/login', { 
        email: email.trim(), 
        password: password 
      });
      
      if (data.success && data.token) {
        await setAuthToken(data.token);
        onLoginSuccess(data.user);
      } else {
        setError('Login failed. Please check your credentials.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.headerContainer}>
          <View style={styles.logoRow}>
            <Image
              source={require('../../assets/app-icon.png')}
              style={{ width: 44, height: 44, borderRadius: 10, marginRight: 10 }}
              resizeMode="contain"
            />
            <Text style={styles.title}>Fit<Text style={styles.titleHighlight}>Flow</Text></Text>
          </View>
          <Text style={styles.subtitle}>Manage your members, plans, and messaging on the go</Text>
        </View>

        <View style={styles.formContainer}>
          {error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.inputWrapper}>
            <Mail size={20} color="#6366f1" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor="#71717a"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Lock size={20} color="#6366f1" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#71717a"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              {showPassword ? (
                <EyeOff size={20} color="#71717a" />
              ) : (
                <Eye size={20} color="#71717a" />
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 1,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#a1a1aa',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  formContainer: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#09090b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    marginBottom: 16,
    paddingHorizontal: 12,
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
  },
  eyeIcon: {
    padding: 4,
  },
  button: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  titleHighlight: {
    color: '#6366f1',
  },
});
