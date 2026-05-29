import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import MembersScreen from './src/screens/MembersScreen';
import PaymentsScreen from './src/screens/PaymentsScreen';
import ScannerScreen from './src/screens/ScannerScreen';
import { getAuthToken, deleteAuthToken } from './src/services/api';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [gymSlug, setGymSlug] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'home' | 'members' | 'payments' | 'scan'>('home');
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    // Check secure store credentials on startup
    const checkToken = async () => {
      const token = await getAuthToken();
      if (token) {
        // Quick session mock since we got a stored token.
        // The api request helper will send it correctly.
        setUser({
          id: 'u_stored',
          name: 'Gym Operator',
          role: 'OWNER',
        });
        setGymSlug('fitlife'); // Default fallback gym slug
      }
      setIsCheckingSession(false);
    };
    checkToken();
  }, []);

  const handleLogout = async () => {
    await deleteAuthToken();
    setUser(null);
    setGymSlug('');
    setActiveTab('home');
  };

  const handleLoginSuccess = (loggedInUser: any) => {
    setUser(loggedInUser);
    setGymSlug(loggedInUser.gym?.slug || 'fitlife');
    setActiveTab('home');
  };

  if (isCheckingSession) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#06b6d4" />
      </View>
    );
  }

  // 1. Unauthenticated Login Screen Route
  if (!user) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <StatusBar barStyle="light-content" />
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      </SafeAreaView>
    );
  }

  // 2. Scan Screen Overlay route (replaces full layout for camera focus)
  if (activeTab === 'scan') {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <StatusBar barStyle="light-content" />
        <ScannerScreen
          gymSlug={gymSlug}
          onNavigateHome={() => setActiveTab('home')}
        />
      </SafeAreaView>
    );
  }

  // 3. Tab Navigation Shell View
  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="light-content" />
      
      {/* Dynamic Screen Renderer */}
      <View style={styles.screenContainer}>
        {activeTab === 'home' && (
          <HomeScreen
            gymSlug={gymSlug}
            onLogout={handleLogout}
            onNavigateToScanner={() => setActiveTab('scan')}
          />
        )}
        {activeTab === 'members' && <MembersScreen gymSlug={gymSlug} />}
        {activeTab === 'payments' && <PaymentsScreen gymSlug={gymSlug} />}
      </View>

      {/* Sleek Custom Bottom Tab Bar (Zero-Dependencies) */}
      <View style={styles.tabBar}>
        {/* Tab 1: Home Dashboard */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('home')}
        >
          <Text style={[styles.tabIcon, activeTab === 'home' ? styles.activeTabIcon : null]}>
            🏠
          </Text>
          <Text style={[styles.tabLabel, activeTab === 'home' ? styles.activeTabLabel : null]}>
            Home
          </Text>
        </TouchableOpacity>

        {/* Tab 2: Members Directory */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('members')}
        >
          <Text style={[styles.tabIcon, activeTab === 'members' ? styles.activeTabIcon : null]}>
            👥
          </Text>
          <Text style={[styles.tabLabel, activeTab === 'members' ? styles.activeTabLabel : null]}>
            Members
          </Text>
        </TouchableOpacity>

        {/* Tab 3: Scanner Shortcut */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('scan')}
        >
          <View style={styles.centerScanCircle}>
            <Text style={styles.scanBtnIcon}>📸</Text>
          </View>
        </TouchableOpacity>

        {/* Tab 4: Verify Payments */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('payments')}
        >
          <Text style={[styles.tabIcon, activeTab === 'payments' ? styles.activeTabIcon : null]}>
            💳
          </Text>
          <Text style={[styles.tabLabel, activeTab === 'payments' ? styles.activeTabLabel : null]}>
            Payments
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// Simple loader wrapper to bypass react-native native imports
const ActivityIndicator = ({ size, color }: { size: string; color: string }) => (
  <View style={{ alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ color, fontSize: 16, fontWeight: 'bold' }}>Loading FitFlow Mobile...</Text>
  </View>
);

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#09090b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenContainer: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    height: 72,
    backgroundColor: '#09090b',
    borderTopWidth: 1,
    borderColor: '#18181b',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: Platform.OS === 'ios' ? 12 : 0,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
  },
  tabIcon: {
    fontSize: 18,
    opacity: 0.4,
  },
  activeTabIcon: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#71717a',
    marginTop: 4,
  },
  activeTabLabel: {
    color: '#06b6d4',
  },
  centerScanCircle: {
    height: 48,
    width: 48,
    borderRadius: 24,
    backgroundColor: '#06b6d4',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: Platform.OS === 'ios' ? -8 : -14,
  },
  scanBtnIcon: {
    fontSize: 20,
  },
});
