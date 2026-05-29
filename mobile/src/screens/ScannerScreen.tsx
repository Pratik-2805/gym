import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { apiRequest } from '../services/api';

interface ScannerScreenProps {
  gymSlug: string;
  onNavigateHome: () => void;
}

export default function ScannerScreen({ gymSlug, onNavigateHome }: ScannerScreenProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [manualMemberId, setManualMemberId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Results Overlay
  const [scanResult, setScanResult] = useState<{
    status: 'SUCCESS' | 'ERROR' | 'IDLE';
    message: string;
    memberName?: string;
    planName?: string;
  }>({ status: 'IDLE', message: '' });

  useEffect(() => {
    const getCameraPermissions = async () => {
      // In expo-camera v15+, standard permissions checks work on both iOS and Android
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };
    getCameraPermissions();
  }, []);

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned || isProcessing) return;
    setScanned(true);
    await processCheckin(data);
  };

  const handleManualSubmit = async () => {
    if (!manualMemberId.trim() || isProcessing) return;
    setScanned(true);
    await processCheckin(manualMemberId.trim());
    setManualMemberId('');
  };

  const processCheckin = async (memberId: string) => {
    setIsProcessing(true);
    setScanResult({ status: 'IDLE', message: 'Verifying check-in status...' });

    try {
      const res = await apiRequest(`/api/dashboard/${gymSlug}/check-in`, {
        method: 'POST',
        body: JSON.stringify({ memberId }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.success) {
          setScanResult({
            status: 'SUCCESS',
            message: 'Access Granted! Enjoy your workout.',
            memberName: data.member.name,
            planName: data.membership.planName,
          });
        } else if (data.error === 'NO_ACTIVE_MEMBERSHIP') {
          setScanResult({
            status: 'ERROR',
            message: 'Access Denied: No active subscription plan.',
            memberName: data.member.name,
          });
        } else {
          setScanResult({
            status: 'ERROR',
            message: data.message || 'Verification failed.',
          });
        }
      } else {
        setScanResult({
          status: 'ERROR',
          message: data.error || 'Server returned verification error.',
        });
      }
    } catch (err) {
      console.error(err);
      setScanResult({
        status: 'ERROR',
        message: 'Network verification failed. Ensure local API is active.',
      });
    } finally {
      setIsProcessing(false);

      // Auto-reset scanner after 4 seconds
      setTimeout(() => {
        setScanned(false);
        setScanResult({ status: 'IDLE', message: '' });
      }, 4000);
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#06b6d4" />
        <Text style={styles.feedbackText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>No camera access permission granted.</Text>
        <Text style={styles.feedbackText}>Please enable camera services in system settings or use the simulator backup below:</Text>
        
        {/* Simulator manual entry fallback */}
        <View style={styles.fallbackBox}>
          <TextInput
            style={styles.input}
            placeholder="Type Member ID to Verify Check-in"
            placeholderTextColor="#52525b"
            value={manualMemberId}
            onChangeText={setManualMemberId}
          />
          <TouchableOpacity style={styles.fallbackBtn} onPress={handleManualSubmit}>
            <Text style={styles.fallbackBtnText}>Verify Attendance</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.backBtn} onPress={onNavigateHome}>
          <Text style={styles.backBtnText}>Return Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Scanner Screen Header */}
      <View style={styles.header}>
        <Text style={styles.title}>QR Attendance Scanner</Text>
        <Text style={styles.subtitle}>Point camera at the member's WhatsApp QR code</Text>
      </View>

      {/* Main Scanner Area */}
      <View style={styles.scannerWrapper}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
        />

        {/* Framing border bounds overlay */}
        <View style={styles.overlayFrame}>
          <View style={styles.scanTarget} />
        </View>

        {/* Results Toast Overlay */}
        {scanResult.status !== 'IDLE' ? (
          <View
            style={[
              styles.resultsToast,
              scanResult.status === 'SUCCESS' ? styles.toastSuccess : styles.toastError,
            ]}
          >
            <Text style={styles.toastStatus}>
              {scanResult.status === 'SUCCESS' ? '🟢 CHECK-IN GRANTED' : '🔴 ACCESS DENIED'}
            </Text>
            {scanResult.memberName && (
              <Text style={styles.toastName}>Name: {scanResult.memberName}</Text>
            )}
            {scanResult.planName && (
              <Text style={styles.toastPlan}>Plan: {scanResult.planName}</Text>
            )}
            <Text style={styles.toastDesc}>{scanResult.message}</Text>
          </View>
        ) : null}
      </View>

      {/* Simulator / Manual Testing Override Input */}
      <View style={styles.controlPanel}>
        <Text style={styles.panelTitle}>SIMULATOR / DESK OVERRIDE</Text>
        <div className="flex flex-row gap-2" style={styles.overrideRow}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            placeholder="Type Member ID (e.g. m_123)"
            placeholderTextColor="#52525b"
            value={manualMemberId}
            onChangeText={setManualMemberId}
          />
          <TouchableOpacity style={styles.overrideBtn} onPress={handleManualSubmit}>
            <Text style={styles.overrideBtnText}>Verify</Text>
          </TouchableOpacity>
        </div>

        <TouchableOpacity style={styles.closeBtn} onPress={onNavigateHome}>
          <Text style={styles.closeBtnText}>Close Scanner</Text>
        </TouchableOpacity>
      </View>
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
  scannerWrapper: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  overlayFrame: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  scanTarget: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#06b6d4',
    borderRadius: 24,
    backgroundColor: 'transparent',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#09090b',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  feedbackText: {
    color: '#71717a',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  fallbackBox: {
    width: '100%',
    backgroundColor: '#18181b',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 16,
    marginTop: 24,
  },
  input: {
    backgroundColor: '#09090b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 12,
  },
  fallbackBtn: {
    backgroundColor: '#06b6d4',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  fallbackBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  backBtn: {
    marginTop: 20,
  },
  backBtnText: {
    color: '#71717a',
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  resultsToast: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  toastSuccess: {
    backgroundColor: '#064e3b',
    borderColor: '#059669',
  },
  toastError: {
    backgroundColor: '#7f1d1d',
    borderColor: '#dc2626',
  },
  toastStatus: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 1,
    marginBottom: 4,
  },
  toastName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  toastPlan: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 2,
  },
  toastDesc: {
    fontSize: 10,
    color: '#e2e8f0',
    marginTop: 6,
    lineHeight: 14,
  },
  controlPanel: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#09090b',
    borderTopWidth: 1,
    borderColor: '#18181b',
  },
  panelTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#52525b',
    letterSpacing: 1,
    marginBottom: 10,
  },
  overrideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  overrideBtn: {
    backgroundColor: '#27272a',
    borderWidth: 1,
    borderColor: '#3f3f46',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginLeft: 8,
  },
  overrideBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  closeBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  closeBtnText: {
    color: '#a1a1aa',
    fontSize: 12,
    fontWeight: '600',
  },
});
