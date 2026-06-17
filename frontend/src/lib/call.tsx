import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from './auth';
import { connectSocket } from './socket';

export type CallState = 'idle' | 'calling' | 'ringing' | 'connected';

// Free in-app voice calls over the internet (WebRTC). Signaling goes through the
// Socket.IO ride room; media is peer-to-peer. Browser-only — on native this needs
// react-native-webrtc + a dev build, so `supported` is false there.
const RTC_CONFIG = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

const G: any = globalThis as any;
const supported =
  typeof G !== 'undefined' &&
  typeof G.RTCPeerConnection !== 'undefined' &&
  !!G.navigator?.mediaDevices?.getUserMedia;

interface CallContextValue {
  state: CallState;
  peerName: string;
  muted: boolean;
  supported: boolean;
  startCall: (rideId: string, peerName: string) => Promise<void>;
  acceptCall: () => Promise<void>;
  declineCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
}

const CallContext = createContext<CallContextValue | null>(null);

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [state, setState] = useState<CallState>('idle');
  const [peerName, setPeerName] = useState('');
  const [muted, setMuted] = useState(false);

  const pcRef = useRef<any>(null);
  const localStreamRef = useRef<any>(null);
  const audioElRef = useRef<any>(null);
  const rideIdRef = useRef<string | null>(null);
  const pendingOfferRef = useRef<any>(null);
  const pendingIceRef = useRef<any[]>([]);

  const emit = useCallback(
    (event: string, payload: any) => {
      if (!token) return;
      connectSocket(token).emit(event, { ...payload, rideId: rideIdRef.current });
    },
    [token]
  );

  const cleanup = useCallback(() => {
    try {
      pcRef.current?.close();
    } catch {}
    pcRef.current = null;
    localStreamRef.current?.getTracks?.().forEach((t: any) => t.stop());
    localStreamRef.current = null;
    if (audioElRef.current) audioElRef.current.srcObject = null;
    pendingOfferRef.current = null;
    pendingIceRef.current = [];
    rideIdRef.current = null;
    setMuted(false);
    setState('idle');
  }, []);

  const ensureAudioEl = useCallback(() => {
    if (!supported || typeof document === 'undefined') return null;
    if (!audioElRef.current) {
      const el = document.createElement('audio');
      el.autoplay = true;
      (el as any).playsInline = true;
      document.body.appendChild(el);
      audioElRef.current = el;
    }
    return audioElRef.current;
  }, []);

  const buildPeer = useCallback(
    async () => {
      const stream = await G.navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      const pc = new G.RTCPeerConnection(RTC_CONFIG);
      stream.getTracks().forEach((track: any) => pc.addTrack(track, stream));
      pc.onicecandidate = (e: any) => {
        if (e.candidate) emit('call:ice', { candidate: e.candidate });
      };
      pc.ontrack = (e: any) => {
        const el = ensureAudioEl();
        if (el) el.srcObject = e.streams[0];
      };
      pc.onconnectionstatechange = () => {
        if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) cleanup();
      };
      pcRef.current = pc;
      return pc;
    },
    [emit, ensureAudioEl, cleanup]
  );

  const flushIce = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) return;
    for (const c of pendingIceRef.current) {
      try {
        await pc.addIceCandidate(c);
      } catch {}
    }
    pendingIceRef.current = [];
  }, []);

  const startCall = useCallback(
    async (rideId: string, name: string) => {
      if (!supported || state !== 'idle') return;
      rideIdRef.current = rideId;
      setPeerName(name);
      setState('calling');
      try {
        connectSocket(token!).emit('ride:join', rideId);
        const pc = await buildPeer();
        emit('call:invite', { callerName: name });
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        emit('call:offer', { sdp: offer });
      } catch {
        cleanup();
      }
    },
    [state, token, buildPeer, emit, cleanup]
  );

  const acceptCall = useCallback(async () => {
    if (!supported || state !== 'ringing' || !pendingOfferRef.current) return;
    try {
      const pc = await buildPeer();
      await pc.setRemoteDescription(pendingOfferRef.current);
      await flushIce();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      emit('call:answer', { sdp: answer });
      setState('connected');
    } catch {
      cleanup();
    }
  }, [state, buildPeer, flushIce, emit, cleanup]);

  const declineCall = useCallback(() => {
    emit('call:decline', {});
    cleanup();
  }, [emit, cleanup]);

  const endCall = useCallback(() => {
    emit('call:end', {});
    cleanup();
  }, [emit, cleanup]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !muted;
    stream.getAudioTracks().forEach((tr: any) => (tr.enabled = !next));
    setMuted(next);
  }, [muted]);

  // Signaling listeners.
  useEffect(() => {
    if (!token || !supported) return;
    const socket = connectSocket(token);

    const onInvite = (p: any) => {
      if (state !== 'idle') return;
      rideIdRef.current = p.rideId;
      setPeerName(p.callerName || '');
    };
    const onOffer = (p: any) => {
      // Incoming call — store the offer and ring.
      rideIdRef.current = p.rideId;
      pendingOfferRef.current = p.sdp;
      setState((s) => (s === 'connected' ? s : 'ringing'));
    };
    const onAnswer = async (p: any) => {
      try {
        await pcRef.current?.setRemoteDescription(p.sdp);
        await flushIce();
        setState('connected');
      } catch {}
    };
    const onIce = async (p: any) => {
      const pc = pcRef.current;
      if (!pc || !pc.remoteDescription) pendingIceRef.current.push(p.candidate);
      else {
        try {
          await pc.addIceCandidate(p.candidate);
        } catch {}
      }
    };
    const onEnd = () => cleanup();
    const onDecline = () => cleanup();

    socket.on('call:invite', onInvite);
    socket.on('call:offer', onOffer);
    socket.on('call:answer', onAnswer);
    socket.on('call:ice', onIce);
    socket.on('call:end', onEnd);
    socket.on('call:decline', onDecline);
    return () => {
      socket.off('call:invite', onInvite);
      socket.off('call:offer', onOffer);
      socket.off('call:answer', onAnswer);
      socket.off('call:ice', onIce);
      socket.off('call:end', onEnd);
      socket.off('call:decline', onDecline);
    };
  }, [token, state, flushIce, cleanup]);

  const value = useMemo<CallContextValue>(
    () => ({ state, peerName, muted, supported, startCall, acceptCall, declineCall, endCall, toggleMute }),
    [state, peerName, muted, startCall, acceptCall, declineCall, endCall, toggleMute]
  );

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall must be used within CallProvider');
  return ctx;
}
