import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { connectToService } from '../platform/api';

export function WelcomeScreen({ connect = connectToService }: { connect?: typeof connectToService }) {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'ready' | 'unavailable'>('idle');
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);
  async function checkConnection() {
    if (pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setStatus('connecting');
    try {
      await connect(controller.signal);
      if (!controller.signal.aborted) setStatus('ready');
    } catch {
      if (!controller.signal.aborted) setStatus('unavailable');
    } finally { if (pending.current === controller) pending.current = null; }
  }
  const message = status === 'ready' ? '服务已连接。' : status === 'unavailable' ? '暂时无法连接，请稍后重试。' : status === 'connecting' ? '正在连接…' : '从了解自己，开始下一次发型选择。';
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.brand}>HairMate</Text>
        <Text style={styles.title}>让下一次理发，{ '\n' }更有把握。</Text>
        <Text style={styles.description}>理解你的头发，梳理你的期待。</Text>
        <Text accessibilityLiveRegion="polite" style={styles.status}>{message}</Text>
        {status === 'connecting' && <ActivityIndicator accessibilityLabel="正在连接" color="#234b3e" />}
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: status === 'connecting' }} disabled={status === 'connecting'} onPress={() => { void checkConnection(); }} style={styles.button}>
          <Text style={styles.buttonText}>{status === 'unavailable' ? '重新连接' : '连接服务'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f7f5ef' },
  content: { flex: 1, justifyContent: 'center', padding: 32, maxWidth: 560, width: '100%', alignSelf: 'center', gap: 24 },
  brand: { color: '#234b3e', fontSize: 22, fontWeight: '600' },
  title: { color: '#182d25', fontSize: 36, fontWeight: '600', lineHeight: 50 },
  description: { color: '#58665e', fontSize: 17, lineHeight: 28 },
  status: { color: '#58665e', fontSize: 15, lineHeight: 24 },
  button: { backgroundColor: '#234b3e', borderRadius: 14, padding: 18, alignItems: 'center' },
  buttonText: { color: '#ffffff', fontSize: 17, fontWeight: '600' },
});
