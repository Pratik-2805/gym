import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ActivityIndicator, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  MessageSquare,
  X,
  User,
  LogOut,
  CheckSquare,
  Bot,
  FileText,
  Settings,
  ChevronDown,
  Dumbbell
} from 'lucide-react-native';
import { initAuthToken, api } from './src/lib/api';

import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import MembersScreen from './src/screens/MembersScreen';
import PlansScreen from './src/screens/PlansScreen';
import InboxScreen from './src/screens/InboxScreen';
import PaymentsScreen from './src/screens/PaymentsScreen';
import ChatbotScreen from './src/screens/ChatbotScreen';
import TemplatesScreen from './src/screens/TemplatesScreen';
import SettingsGeneralScreen from './src/screens/SettingsGeneralScreen';
import SettingsWhatsappScreen from './src/screens/SettingsWhatsappScreen';

type Screen =
  | 'dashboard'
  | 'members'
  | 'plans'
  | 'inbox'
  | 'payments'
  | 'chatbot'
  | 'templates'
  | 'settings_general'
  | 'settings_whatsapp';

export default function App() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<any | null>(null);
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsDropdownOpen, setSettingsDropdownOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = await initAuthToken();
      if (token) {
        try {
          const res = await api.get('/api/auth/me');
          if (res.data && res.data.user) {
            setUser(res.data.user);
            setCurrentScreen('dashboard');
          } else {
            setUser(null);
          }
        } catch (e) {
          console.warn('[App Init] Auth validation failed:', e);
          setUser(null);
        }
      }
      setInitializing(false);
    };

    checkAuth();
  }, []);

  const handleLoginSuccess = (loggedInUser: any) => {
    setUser(loggedInUser);
    setCurrentScreen('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (initializing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <StatusBar style="light" />
      </View>
    );
  }

  if (!user) {
    return (
      <>
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
        <StatusBar style="light" />
      </>
    );
  }

  const renderActiveScreen = () => {
    switch (currentScreen) {
      case 'dashboard':
        return <DashboardScreen user={user} onLogout={handleLogout} onMenuPress={() => setSidebarOpen(true)} />;
      case 'members':
        return <MembersScreen onMenuPress={() => setSidebarOpen(true)} />;
      case 'plans':
        return <PlansScreen onMenuPress={() => setSidebarOpen(true)} />;
      case 'payments':
        return <PaymentsScreen onMenuPress={() => setSidebarOpen(true)} />;
      case 'inbox':
        return <InboxScreen onMenuPress={() => setSidebarOpen(true)} />;
      case 'chatbot':
        return <ChatbotScreen onMenuPress={() => setSidebarOpen(true)} />;
      case 'templates':
        return <TemplatesScreen onMenuPress={() => setSidebarOpen(true)} />;
      case 'settings_general':
        return <SettingsGeneralScreen onMenuPress={() => setSidebarOpen(true)} />;
      case 'settings_whatsapp':
        return <SettingsWhatsappScreen onMenuPress={() => setSidebarOpen(true)} />;
      default:
        return <DashboardScreen user={user} onLogout={handleLogout} onMenuPress={() => setSidebarOpen(true)} />;
    }
  };

  const getFooterIconColor = (screenName: Screen) => {
    if (screenName === 'settings_whatsapp' || screenName === 'settings_general') {
      return (currentScreen === 'settings_whatsapp' || currentScreen === 'settings_general') ? '#6366f1' : '#71717a';
    }
    return currentScreen === screenName ? '#6366f1' : '#71717a';
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {renderActiveScreen()}
      </View>

      {/* Premium Bottom Tab Bar - Quick Links */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setCurrentScreen('dashboard')}
        >
          <LayoutDashboard size={22} color={getFooterIconColor('dashboard')} />
          <Text style={[styles.tabLabel, currentScreen === 'dashboard' ? styles.tabLabelActive : styles.tabLabelInactive]}>
            Overview
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setCurrentScreen('members')}
        >
          <Users size={22} color={getFooterIconColor('members')} />
          <Text style={[styles.tabLabel, currentScreen === 'members' ? styles.tabLabelActive : styles.tabLabelInactive]}>
            Members
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setCurrentScreen('inbox')}
        >
          <MessageSquare size={22} color={getFooterIconColor('inbox')} />
          <Text style={[styles.tabLabel, currentScreen === 'inbox' ? styles.tabLabelActive : styles.tabLabelInactive]}>
            Inbox
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setSidebarOpen(true)}
        >
          <Settings size={22} color="#71717a" />
          <Text style={[styles.tabLabel, styles.tabLabelInactive]}>
            More
          </Text>
        </TouchableOpacity>
      </View>

      {/* Collapsable Sidebar Drawer Overlay */}
      {sidebarOpen && (
        <View style={styles.sidebarOverlay}>
          <TouchableOpacity
            style={styles.sidebarBackdrop}
            activeOpacity={1}
            onPress={() => setSidebarOpen(false)}
          />
          <View style={styles.sidebarContent}>
            <View style={styles.sidebarHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Image
                  source={require('./assets/app-icon.png')}
                  style={{ width: 32, height: 32, borderRadius: 8, marginRight: 8 }}
                  resizeMode="contain"
                />
                <Text style={styles.sidebarTitle}>FitFlow</Text>
              </View>
              <TouchableOpacity onPress={() => setSidebarOpen(false)} style={styles.sidebarCloseButton}>
                <X size={20} color="#a1a1aa" />
              </TouchableOpacity>
            </View>

            <View style={styles.sidebarUserSection}>
              <View style={styles.sidebarAvatar}>
                <User size={24} color="#6366f1" />
              </View>
              <View>
                <Text style={styles.sidebarUserName}>{user?.name}</Text>
                <Text style={styles.sidebarUserRole}>{user?.role}</Text>
              </View>
            </View>

            <View style={styles.sidebarMenu}>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                <TouchableOpacity
                  style={[styles.sidebarMenuItem, currentScreen === 'dashboard' && styles.sidebarMenuItemActive]}
                  onPress={() => {
                    setCurrentScreen('dashboard');
                    setSidebarOpen(false);
                  }}
                >
                  <LayoutDashboard size={20} color={getFooterIconColor('dashboard')} />
                  <Text style={[styles.sidebarMenuText, currentScreen === 'dashboard' && styles.sidebarMenuTextActive]}>
                    Overview
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sidebarMenuItem, currentScreen === 'members' && styles.sidebarMenuItemActive]}
                  onPress={() => {
                    setCurrentScreen('members');
                    setSidebarOpen(false);
                  }}
                >
                  <Users size={20} color={getFooterIconColor('members')} />
                  <Text style={[styles.sidebarMenuText, currentScreen === 'members' && styles.sidebarMenuTextActive]}>
                    Members Directory
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sidebarMenuItem, currentScreen === 'plans' && styles.sidebarMenuItemActive]}
                  onPress={() => {
                    setCurrentScreen('plans');
                    setSidebarOpen(false);
                  }}
                >
                  <CreditCard size={20} color={getFooterIconColor('plans')} />
                  <Text style={[styles.sidebarMenuText, currentScreen === 'plans' && styles.sidebarMenuTextActive]}>
                    Membership Plans
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sidebarMenuItem, currentScreen === 'payments' && styles.sidebarMenuItemActive]}
                  onPress={() => {
                    setCurrentScreen('payments');
                    setSidebarOpen(false);
                  }}
                >
                  <CheckSquare size={20} color={getFooterIconColor('payments')} />
                  <Text style={[styles.sidebarMenuText, currentScreen === 'payments' && styles.sidebarMenuTextActive]}>
                    Payments History
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sidebarMenuItem, currentScreen === 'inbox' && styles.sidebarMenuItemActive]}
                  onPress={() => {
                    setCurrentScreen('inbox');
                    setSidebarOpen(false);
                  }}
                >
                  <MessageSquare size={20} color={getFooterIconColor('inbox')} />
                  <Text style={[styles.sidebarMenuText, currentScreen === 'inbox' && styles.sidebarMenuTextActive]}>
                    Live Chat / Inbox
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sidebarMenuItem, currentScreen === 'chatbot' && styles.sidebarMenuItemActive]}
                  onPress={() => {
                    setCurrentScreen('chatbot');
                    setSidebarOpen(false);
                  }}
                >
                  <Bot size={20} color={getFooterIconColor('chatbot')} />
                  <Text style={[styles.sidebarMenuText, currentScreen === 'chatbot' && styles.sidebarMenuTextActive]}>
                    Chatbot Configs
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sidebarMenuItem, currentScreen === 'templates' && styles.sidebarMenuItemActive]}
                  onPress={() => {
                    setCurrentScreen('templates');
                    setSidebarOpen(false);
                  }}
                >
                  <FileText size={20} color={getFooterIconColor('templates')} />
                  <Text style={[styles.sidebarMenuText, currentScreen === 'templates' && styles.sidebarMenuTextActive]}>
                    WhatsApp Templates
                  </Text>
                </TouchableOpacity>

                {/* Collapsable Dropdown System Settings Menu */}
                <TouchableOpacity
                  style={[
                    styles.sidebarMenuItem,
                    (currentScreen === 'settings_general' || currentScreen === 'settings_whatsapp') && styles.sidebarMenuItemActive
                  ]}
                  onPress={() => setSettingsDropdownOpen(!settingsDropdownOpen)}
                >
                  <Settings size={20} color={(currentScreen === 'settings_general' || currentScreen === 'settings_whatsapp') ? '#6366f1' : '#71717a'} />
                  <Text style={[
                    styles.sidebarMenuText,
                    (currentScreen === 'settings_general' || currentScreen === 'settings_whatsapp') && styles.sidebarMenuTextActive,
                    { flex: 1 }
                  ]}>
                    System Settings
                  </Text>
                  <ChevronDown
                    size={16}
                    color="#71717a"
                    style={{ transform: [{ rotate: settingsDropdownOpen ? '180deg' : '0deg' }] }}
                  />
                </TouchableOpacity>

                {settingsDropdownOpen && (
                  <View style={styles.submenuContainer}>
                    <TouchableOpacity
                      style={[styles.submenuItem, currentScreen === 'settings_general' && styles.submenuItemActive]}
                      onPress={() => {
                        setCurrentScreen('settings_general');
                        setSidebarOpen(false);
                      }}
                    >
                      <View style={[styles.submenuDot, currentScreen === 'settings_general' && styles.submenuDotActive]} />
                      <Text style={[styles.submenuText, currentScreen === 'settings_general' && styles.submenuTextActive]}>
                        General Info
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.submenuItem, currentScreen === 'settings_whatsapp' && styles.submenuItemActive]}
                      onPress={() => {
                        setCurrentScreen('settings_whatsapp');
                        setSidebarOpen(false);
                      }}
                    >
                      <View style={[styles.submenuDot, currentScreen === 'settings_whatsapp' && styles.submenuDotActive]} />
                      <Text style={[styles.submenuText, currentScreen === 'settings_whatsapp' && styles.submenuTextActive]}>
                        WhatsApp Setup
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            </View>

            <TouchableOpacity style={styles.sidebarLogoutButton} onPress={() => {
              handleLogout();
              setSidebarOpen(false);
            }}>
              <LogOut size={20} color="#ef4444" style={{ marginRight: 10 }} />
              <Text style={styles.sidebarLogoutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <StatusBar style="light" />
      </SafeAreaView>
    </SafeAreaProvider>
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
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: '#18181b',
    borderTopWidth: 1,
    borderColor: '#27272a',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 8,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#6366f1',
  },
  tabLabelInactive: {
    color: '#71717a',
  },

  // Collapsable Sidebar Styles
  sidebarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    zIndex: 9999,
  },
  sidebarBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  sidebarContent: {
    width: '75%',
    height: '100%',
    backgroundColor: '#18181b',
    borderRightWidth: 1,
    borderColor: '#27272a',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  sidebarTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  sidebarCloseButton: {
    padding: 4,
  },
  sidebarUserSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: '#27272a',
    marginBottom: 24,
  },
  sidebarAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sidebarUserName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  sidebarUserRole: {
    fontSize: 12,
    color: '#a1a1aa',
    marginTop: 2,
  },
  sidebarMenu: {
    flex: 1,
  },
  sidebarMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  sidebarMenuItemActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  sidebarMenuText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#71717a',
    marginLeft: 14,
  },
  sidebarMenuTextActive: {
    color: '#6366f1',
    fontWeight: 'bold',
  },
  sidebarLogoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginTop: 'auto',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  sidebarLogoutText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: 'bold',
  },

  // Submenu Styles
  submenuContainer: {
    paddingLeft: 34,
    marginBottom: 8,
  },
  submenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  submenuItemActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
  },
  submenuDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#71717a',
    marginRight: 10,
  },
  submenuDotActive: {
    backgroundColor: '#6366f1',
  },
  submenuText: {
    fontSize: 13,
    color: '#71717a',
    fontWeight: '500',
  },
  submenuTextActive: {
    color: '#6366f1',
    fontWeight: 'bold',
  },
});
