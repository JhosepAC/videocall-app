import {useCallback, useEffect, useRef, useState} from 'react'
import {io, Socket} from 'socket.io-client'
import {PeerSession} from '@/lib/peer-session'

const SIGNALING_SERVER = process.env.NEXT_PUBLIC_SIGNALING_SERVER_URL || 'http://localhost:3001'
function iceConfiguration(): RTCConfiguration {
    try {
        const servers: unknown = JSON.parse(process.env.NEXT_PUBLIC_ICE_SERVERS || '[]')
        if (!Array.isArray(servers)) throw new Error('Expected ICE server array')
        return {iceServers: servers as RTCIceServer[], bundlePolicy: 'max-bundle'}
    } catch {
        console.warn('[WebRTC] NEXT_PUBLIC_ICE_SERVERS must be a JSON array')
        return {iceServers: []}
    }
}
export interface ParticipantInfo {
    participantId: string
    socketId: string
    userId: string
    fullName: string
    username: string
    avatarUrl: string | null
    isVideoMuted: boolean
    isAudioMuted: boolean
    isHandRaised: boolean
    isEnhanced: boolean
    isConnected: boolean
    isHost: boolean
    isScreenSharing: boolean
    joinedAt: number
}
export interface ReactionEvent {
    id: string
    sequence: number
    participantId: string
    socketId: string
    emoji: string
    x: number
    y: number
    size: number
    createdAt: number
    expiresAt: number
}
export interface ChatMessage {
    id: string
    sequence: number
    participantId: string
    fullName: string
    body: string
    clientMessageId: string
    createdAt: number
}
export interface RoomState {
    version: number
    hostParticipantId: string | null
    activeScreenShareIds: string[]
    participants: ParticipantInfo[]
    reactions: ReactionEvent[]
    messages: ChatMessage[]
}
type UserInfo = Pick<ParticipantInfo, 'userId' | 'fullName' | 'username' | 'avatarUrl' | 'isVideoMuted' | 'isAudioMuted'> & {isEnhanced?: boolean}
type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'error'
const emptyRoom: RoomState = {version: -1, hostParticipantId: null, activeScreenShareIds: [], participants: [], reactions: [], messages: []}

export function useWebRTC(roomId: string, localStream: MediaStream | null, screenTrack: MediaStreamTrack | null,
                          userInfo: UserInfo, isHandRaised: boolean, shouldConnect = true) {
    const [roomState, setRoomState] = useState<RoomState>(emptyRoom)
    const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({})
    const [remoteScreenStreams, setRemoteScreenStreams] = useState<Record<string, MediaStream>>({})
    const [peerStates, setPeerStates] = useState<Record<string, RTCPeerConnectionState>>({})
    const [remoteReactions, setRemoteReactions] = useState<ReactionEvent[]>([])
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')
    const [roomEnded, setRoomEnded] = useState(false)
    const socketRef = useRef<Socket | null>(null)
    const peersRef = useRef(new Map<string, PeerSession>())
    const latestRef = useRef({localStream, screenTrack, userInfo, isHandRaised})
    const outgoingVideoRef = useRef<MediaStreamTrack | null>(null)
    const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>())
    const pendingMessageRef = useRef<{body: string; id: string} | null>(null)
    const readyForMedia = Boolean(localStream)
    useEffect(() => { latestRef.current = {localStream, screenTrack, userInfo, isHandRaised} }, [localStream, screenTrack, userInfo, isHandRaised])

    const applyMessage = useCallback((message: ChatMessage) => {
        setMessages(current => current.some(item => item.id === message.id) ? current :
            [...current, message].sort((a, b) => a.sequence - b.sequence).slice(-100))
    }, [])
    const applyReaction = useCallback((reaction: ReactionEvent) => {
        if (reaction.expiresAt <= Date.now()) return
        setRemoteReactions(current => current.some(item => item.id === reaction.id) ? current : [...current, reaction])
        clearTimeout(timersRef.current.get(reaction.id))
        timersRef.current.set(reaction.id, setTimeout(() => {
            setRemoteReactions(current => current.filter(item => item.id !== reaction.id))
            timersRef.current.delete(reaction.id)
        }, Math.min(4000, reaction.expiresAt - Date.now())))
    }, [])
    const updateTracks = useCallback(() => {
        const {localStream: stream, screenTrack: screen} = latestRef.current
        const nativeVideo = stream?.getVideoTracks()[0] || null
        const processedVideo = outgoingVideoRef.current
        // Canvas/WebGL rendering can stop entirely in a hidden document. Native
        // camera capture sent through WebRTC does not depend on the paint loop.
        // Keep the preferred track so foregrounding restores image adjustments.
        const video = document.hidden || processedVideo?.readyState !== 'live' ? nativeVideo : processedVideo
        peersRef.current.forEach(peer => void peer.setTracks(stream?.getAudioTracks()[0] || null, video, screen))
    }, [])

    useEffect(() => {
        // Run directly from the lifecycle event: background React renders and
        // timers may be throttled too. Never change the user's mute/camera state.
        document.addEventListener('visibilitychange', updateTracks)
        window.addEventListener('pageshow', updateTracks)
        return () => {
            document.removeEventListener('visibilitychange', updateTracks)
            window.removeEventListener('pageshow', updateTracks)
        }
    }, [updateTracks])

    useEffect(() => {
        if (!shouldConnect || !readyForMedia || !userInfo.userId) return
        const socket = io(SIGNALING_SERVER, {
            autoConnect: false,
            reconnection: true, reconnectionDelay: 400, reconnectionDelayMax: 4000,
        })
        socketRef.current = socket
        const peers = peersRef.current
        const timers = timersRef.current
        let version = -1
        let joined = false
        let disposed = false
        let connectionGeneration = 0
        let joinTimer: ReturnType<typeof setTimeout> | undefined
        const clearPeer = (id: string) => {
            peers.get(id)?.close()
            peers.delete(id)
            const without = <T,>(current: Record<string, T>) => {
                const next = {...current}
                delete next[id]
                return next
            }
            setRemoteStreams(without)
            setRemoteScreenStreams(without)
            setPeerStates(without)
        }
        const ensurePeer = (id: string) => {
            if (peers.has(id)) return peers.get(id)!
            const peer = new PeerSession(iceConfiguration(), (socket.id || '') > id, {
                signal: description => {
                    if (socket.connected) socket.emit(description.type === 'offer' ? 'webrtc-offer' : 'webrtc-answer',
                        {toSocketId: id, [description.type]: description})
                },
                candidate: candidate => {
                    if (socket.connected) socket.emit('ice-candidate', {toSocketId: id, candidate})
                },
                streams: (camera, screen) => {
                    setRemoteStreams(current => current[id] === camera ? current : {...current, [id]: camera})
                    setRemoteScreenStreams(current => current[id] === screen ? current : {...current, [id]: screen})
                },
                state: state => setPeerStates(current => ({...current, [id]: state})),
                error: error => console.warn('[WebRTC]', error),
            })
            peers.set(id, peer)
            updateTracks()
            return peer
        }
        const applyState = (state: RoomState) => {
            if (disposed || !joined || !state || state.version <= version) return
            version = state.version
            setRoomState(state)
            setConnectionStatus('connected')
            const others = state.participants.filter(item => item.participantId !== userInfo.userId)
            const ids = new Set(others.map(item => item.socketId))
            for (const id of peers.keys()) if (!ids.has(id)) clearPeer(id)
            for (const participant of others) if (participant.isConnected) ensurePeer(participant.socketId)
            state.reactions.forEach(applyReaction)
            for (const message of state.messages || []) applyMessage(message)
        }
        const join = () => {
            if (disposed || !socket.connected) return
            const latest = latestRef.current
            const generation = connectionGeneration
            socket.timeout(5000).emit('join-room', {
                roomId, participantId: userInfo.userId, ...latest.userInfo,
                isHandRaised: latest.isHandRaised, isScreenSharing: Boolean(latest.screenTrack),
            }, (error: Error | null, result?: {ok: boolean; state?: RoomState}) => {
                if (disposed || generation !== connectionGeneration || !socket.connected) return
                if (error || !result?.ok || !result.state) {
                    setConnectionStatus('error')
                    joinTimer = setTimeout(join, 2000)
                    return
                }
                joined = true
                applyState(result.state)
                updateTracks()
            })
        }
        socket.on('connect', () => {
            connectionGeneration++
            version = -1
            joined = false
            for (const id of peers.keys()) clearPeer(id)
            setRoomState(emptyRoom)
            setMessages([])
            setConnectionStatus('connecting')
            clearTimeout(joinTimer)
            join()
        })
        socket.on('disconnect', reason => {
            connectionGeneration++
            joined = false
            setConnectionStatus(reason === 'io server disconnect' ? 'error' : 'reconnecting')
            clearTimeout(joinTimer)
        })
        socket.on('connect_error', () => setConnectionStatus('reconnecting'))
        socket.on('room-state', applyState)
        socket.on('participant-reconnected', (info: ParticipantInfo) => {
            if (joined && info.participantId !== userInfo.userId) {
                clearPeer(info.socketId)
                ensurePeer(info.socketId)
            }
        })
        socket.on('reaction', applyReaction)
        socket.on('chat-message', applyMessage)
        socket.on('room-ended', () => {
            setRoomEnded(true)
            socket.disconnect()
            for (const id of peers.keys()) clearPeer(id)
        })
        socket.on('webrtc-offer', ({fromSocketId, offer}: {fromSocketId: string; offer: RTCSessionDescriptionInit}) => {
            if (joined) void ensurePeer(fromSocketId).receive(offer)
        })
        socket.on('webrtc-answer', ({fromSocketId, answer}: {fromSocketId: string; answer: RTCSessionDescriptionInit}) => {
            void peers.get(fromSocketId)?.receive(answer)
        })
        socket.on('ice-candidate', ({fromSocketId, candidate}: {fromSocketId: string; candidate: RTCIceCandidateInit}) => {
            if (joined) void ensurePeer(fromSocketId).addCandidate(candidate)
        })
        const offline = () => {
            setConnectionStatus('reconnecting')
            socket.io.engine?.close()
        }
        const online = () => socket.connect()
        window.addEventListener('offline', offline)
        window.addEventListener('online', online)
        socket.connect()
        return () => {
            disposed = true
            window.removeEventListener('offline', offline)
            window.removeEventListener('online', online)
            clearTimeout(joinTimer)
            if (socket.connected) socket.emit('leave-room')
            socket.removeAllListeners()
            socket.disconnect()
            peers.forEach(peer => peer.close())
            peers.clear()
            timers.forEach(clearTimeout)
            timers.clear()
            if (socketRef.current === socket) socketRef.current = null
        }
    }, [roomId, shouldConnect, readyForMedia, userInfo.userId, applyMessage, applyReaction, updateTracks])
    useEffect(updateTracks, [localStream, screenTrack, updateTracks])
    const emitPatch = useCallback((patch: Record<string, boolean>) => {
        const socket = socketRef.current
        if (socket?.connected) socket.emit('update-room-state', {patch})
    }, [])
    useEffect(() => {
        emitPatch({isVideoMuted: userInfo.isVideoMuted, isAudioMuted: userInfo.isAudioMuted,
            isEnhanced: Boolean(userInfo.isEnhanced), isHandRaised, isScreenSharing: Boolean(screenTrack)})
    }, [userInfo.isVideoMuted, userInfo.isAudioMuted, userInfo.isEnhanced, isHandRaised, screenTrack, connectionStatus, emitPatch])
    const sendMessage = useCallback(async (body: string) => {
        const socket = socketRef.current
        if (!socket?.connected || !body.trim()) return false
        const clientMessageId = pendingMessageRef.current?.body === body ? pendingMessageRef.current.id : crypto.randomUUID()
        pendingMessageRef.current = {body, id: clientMessageId}
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                const result = await socket.timeout(5000).emitWithAck('send-message', {body, clientMessageId})
                if (result?.ok && result.message) {
                    applyMessage(result.message)
                    if (pendingMessageRef.current?.id === clientMessageId) pendingMessageRef.current = null
                    return true
                }
                return false
            } catch { if (!socket.connected) return false }
        }
        return false
    }, [applyMessage])
    const replaceVideoTrack = useCallback((track: MediaStreamTrack) => {
        outgoingVideoRef.current = track
        updateTracks()
    }, [updateTracks])
    const endRoom = useCallback(async () => {
        try { return Boolean((await socketRef.current?.timeout(5000).emitWithAck('end-room'))?.ok) }
        catch { return false }
    }, [])
    const leaveRoom = useCallback(() => {
        socketRef.current?.emit('leave-room')
        socketRef.current?.disconnect()
        peersRef.current.forEach(peer => peer.close())
    }, [])
    const reconnect = useCallback(() => { socketRef.current?.disconnect().connect() }, [])
    const emitReaction = useCallback((emoji: string) => {
        if (socketRef.current?.connected) socketRef.current.emit('send-reaction', {emoji, clientReactionId: crypto.randomUUID()})
    }, [])
    const remoteParticipants = Object.fromEntries(roomState.participants.filter(item => item.participantId !== userInfo.userId).map(item => [item.socketId, item]))
    return {remoteStreams, remoteScreenStreams, remoteParticipants, remoteReactions, roomState,
        localParticipant: roomState.participants.find(item => item.participantId === userInfo.userId) ?? null,
        activeScreenShareIds: roomState.activeScreenShareIds, roomEnded, connectionStatus, peerStates, messages,
        sendMessage, reconnect, endRoom, leaveRoom, emitReaction, replaceVideoTrack}
}
