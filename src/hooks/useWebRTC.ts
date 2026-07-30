import {useCallback, useEffect, useRef, useState} from 'react'
import {io, Socket} from 'socket.io-client'

const SIGNALING_SERVER = process.env.NEXT_PUBLIC_SIGNALING_SERVER_URL || 'http://localhost:3001'

function configuredIceServers(): RTCIceServer[] {
    const raw = process.env.NEXT_PUBLIC_ICE_SERVERS
    if (!raw) return []
    try {
        const parsed: unknown = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed as RTCIceServer[] : []
    } catch {
        console.warn('[WebRTC] NEXT_PUBLIC_ICE_SERVERS must be a JSON array')
        return []
    }
}

// Production deployments should point this to self-hosted coturn/STUN nodes,
// e.g. NEXT_PUBLIC_ICE_SERVERS='[{"urls":"turn:turn.example.org:3478","username":"...","credential":"..."}]'.
// No third-party STUN service is used by default.
const ICE_SERVERS: RTCConfiguration = {iceServers: configuredIceServers()}

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

export interface RoomState {
    version: number
    hostParticipantId: string | null
    activeScreenShareIds: string[]
    participants: ParticipantInfo[]
    reactions: ReactionEvent[]
}

type UserInfo = {
    userId: string
    fullName: string
    username: string
    avatarUrl: string | null
    isVideoMuted: boolean
    isAudioMuted: boolean
    isEnhanced?: boolean
}

const emptyRoomState: RoomState = {
    version: -1,
    hostParticipantId: null,
    activeScreenShareIds: [],
    participants: [],
    reactions: [],
}

/**
 * WebRTC transport plus the authoritative Socket.IO room projection.
 * Socket lifecycle is intentionally independent from media-state changes: a
 * mute, filter, or screen-share only replaces a sender track and never tears
 * down a peer connection.
 */
export function useWebRTC(
    roomId: string,
    localStream: MediaStream | null,
    screenTrack: MediaStreamTrack | null,
    userInfo: UserInfo,
    isHandRaised: boolean,
    shouldConnect = true,
) {
    const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({})
    const [remoteScreenStreams, setRemoteScreenStreams] = useState<Record<string, MediaStream>>({})
    const remoteCameraStreamsRef = useRef<Record<string, MediaStream>>({})
    const [remoteParticipants, setRemoteParticipants] = useState<Record<string, ParticipantInfo>>({})
    const [remoteReactions, setRemoteReactions] = useState<ReactionEvent[]>([])
    const [roomState, setRoomState] = useState<RoomState>(emptyRoomState)
    const [roomEnded, setRoomEnded] = useState(false)

    const socketRef = useRef<Socket | null>(null)
    const peersRef = useRef<Record<string, RTCPeerConnection>>({})
    const pendingIceRef = useRef<Record<string, RTCIceCandidateInit[]>>({})
    const streamRef = useRef<MediaStream | null>(localStream)
    const screenTrackRef = useRef<MediaStreamTrack | null>(screenTrack)
    const userInfoRef = useRef<UserInfo>(userInfo)
    const handRaisedRef = useRef(isHandRaised)
    const participantIdRef = useRef(userInfo.userId)
    const stateVersionRef = useRef(-1)
    const participantSocketsRef = useRef<Record<string, string>>({})
    const reactionTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
    const mutationCounterRef = useRef(0)

    useEffect(() => {
        streamRef.current = localStream
        screenTrackRef.current = screenTrack
        userInfoRef.current = userInfo
        handRaisedRef.current = isHandRaised
        if (userInfo.userId) participantIdRef.current = userInfo.userId
    }, [localStream, screenTrack, userInfo, isHandRaised])

    const closePeer = useCallback((socketId: string) => {
        peersRef.current[socketId]?.close()
        delete peersRef.current[socketId]
        delete pendingIceRef.current[socketId]
        delete remoteCameraStreamsRef.current[socketId]
        setRemoteStreams(current => {
            if (!(socketId in current)) return current
            const next = {...current}
            delete next[socketId]
            return next
        })
        setRemoteScreenStreams(current => {
            if (!(socketId in current)) return current
            const next = {...current}
            delete next[socketId]
            return next
        })
    }, [])

    const replaceVideoTrack = useCallback((newVideoTrack: MediaStreamTrack) => {
        Object.values(peersRef.current).forEach(peer => {
            const sender = peer.getSenders().find(candidate => candidate.track?.kind === 'video')
            if (sender && sender.track !== newVideoTrack) {
                void sender.replaceTrack(newVideoTrack).catch(error => {
                    console.warn('[WebRTC] Unable to replace video track', error)
                })
            }
        })
    }, [])

    const negotiate = useCallback(async (peerId: string) => {
        const socket = socketRef.current
        if (!socket?.connected) return
        const peer = peersRef.current[peerId]
        if (!peer || peer.signalingState !== 'stable') return
        try {
            const offer = await peer.createOffer()
            await peer.setLocalDescription(offer)
            socket.emit('webrtc-offer', {toSocketId: peerId, offer})
        } catch (error) {
            console.warn('[WebRTC] Unable to negotiate', error)
        }
    }, [])

    const addScreenTrack = useCallback((track: MediaStreamTrack) => {
        Object.entries(peersRef.current).forEach(([peerId, peer]) => {
            const alreadyAdded = peer.getSenders().some(s => s.track === track)
            if (alreadyAdded) return
            try {
                peer.addTrack(track, new MediaStream([track]))
                negotiate(peerId)
            } catch (err) {
                console.warn('[WebRTC] Unable to add screen track', err)
            }
        })
    }, [negotiate])

    const removeScreenTrack = useCallback(() => {
        const track = screenTrackRef.current
        if (!track) return
        Object.entries(peersRef.current).forEach(([peerId, peer]) => {
            const sender = peer.getSenders().find(s => s.track === track)
            if (sender) {
                try {
                    peer.removeTrack(sender)
                    negotiate(peerId)
                } catch (err) {
                    console.warn('[WebRTC] Unable to remove screen track', err)
                }
            }
        })
    }, [negotiate])

    const createPeerConnection = useCallback((peerId: string, socket: Socket) => {
        const existing = peersRef.current[peerId]
        if (existing && existing.connectionState !== 'closed') return existing

        const peer = new RTCPeerConnection(ICE_SERVERS)
        const stream = streamRef.current
        if (stream) {
            stream.getTracks().forEach(track => peer.addTrack(track, stream))
        }
        const screenTrk = screenTrackRef.current
        if (screenTrk) {
            try {
                peer.addTrack(screenTrk, new MediaStream([screenTrk]))
            } catch (err) {
                console.warn('[WebRTC] Unable to add screen track to new peer', err)
            }
        }

        peer.ontrack = event => {
            const streamFromEvent = event.streams[0] || new MediaStream([event.track])
            const existingCamera = remoteCameraStreamsRef.current[peerId]
            if (existingCamera && existingCamera !== streamFromEvent) {
                setRemoteScreenStreams(current => current[peerId] === streamFromEvent
                    ? current
                    : {...current, [peerId]: streamFromEvent})
            } else {
                remoteCameraStreamsRef.current[peerId] = streamFromEvent
                setRemoteStreams(current => current[peerId] === streamFromEvent
                    ? current
                    : {...current, [peerId]: streamFromEvent})
            }
        }
        peer.onicecandidate = event => {
            if (event.candidate) {
                socket.emit('ice-candidate', {toSocketId: peerId, candidate: event.candidate})
            }
        }
        peer.onconnectionstatechange = () => {
            if (peer.connectionState === 'failed' || peer.connectionState === 'closed') closePeer(peerId)
        }
        peersRef.current[peerId] = peer
        return peer
    }, [closePeer])

    const applyReaction = useCallback((reaction: ReactionEvent) => {
        if (reaction.expiresAt <= Date.now()) return
        setRemoteReactions(current => current.some(item => item.id === reaction.id)
            ? current
            : [...current, reaction].sort((a, b) => a.sequence - b.sequence))
        const previous = reactionTimersRef.current[reaction.id]
        if (previous) clearTimeout(previous)
        reactionTimersRef.current[reaction.id] = setTimeout(() => {
            setRemoteReactions(current => current.filter(item => item.id !== reaction.id))
            delete reactionTimersRef.current[reaction.id]
        }, Math.max(0, reaction.expiresAt - Date.now()))
    }, [])

    const applyRoomState = useCallback((next: RoomState) => {
        if (!next || typeof next.version !== 'number' || next.version <= stateVersionRef.current) return
        stateVersionRef.current = next.version
        setRoomState(next)

        const selfId = participantIdRef.current
        const remote: Record<string, ParticipantInfo> = {}
        const socketByParticipant: Record<string, string> = {}
        for (const participant of next.participants) {
            if (participant.participantId === selfId) continue
            remote[participant.socketId] = participant
            socketByParticipant[participant.participantId] = participant.socketId
        }
        setRemoteParticipants(remote)

        // A reconnect changes only the Socket.IO/WebRTC endpoint. Close the
        // old endpoint once the authoritative snapshot names the replacement.
        for (const [participantId, oldSocketId] of Object.entries(participantSocketsRef.current)) {
            const newSocketId = socketByParticipant[participantId]
            if (!newSocketId || newSocketId !== oldSocketId || !remote[newSocketId]?.isConnected) {
                closePeer(oldSocketId)
            }
        }
        participantSocketsRef.current = socketByParticipant
        next.reactions.forEach(applyReaction)
    }, [applyReaction, closePeer])

    const flushIceCandidates = useCallback(async (peerId: string, peer: RTCPeerConnection) => {
        const queued = pendingIceRef.current[peerId] || []
        delete pendingIceRef.current[peerId]
        for (const candidate of queued) {
            try {
                await peer.addIceCandidate(new RTCIceCandidate(candidate))
            } catch (error) {
                console.warn('[WebRTC] Unable to apply queued ICE candidate', error)
            }
        }
    }, [])

    useEffect(() => {
        if (!shouldConnect || !localStream || !userInfo.userId) return

        const socket = io(SIGNALING_SERVER, {
            autoConnect: false,
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 250,
            reconnectionDelayMax: 2_000,
        })
        socketRef.current = socket
        const peerConnections = peersRef.current

        const join = () => {
            const info = userInfoRef.current
            socket.emit('join-room', {
                roomId,
                participantId: userInfo.userId,
                ...info,
                isHandRaised: handRaisedRef.current,
            }, (result: { state?: RoomState } | undefined) => {
                if (result?.state) applyRoomState(result.state)
            })
        }

        const offerToPeer = async (info: ParticipantInfo) => {
            if (info.participantId === participantIdRef.current || !info.isConnected) return
            const peer = createPeerConnection(info.socketId, socket)
            if (peer.signalingState !== 'stable') return
            try {
                const offer = await peer.createOffer()
                await peer.setLocalDescription(offer)
                socket.emit('webrtc-offer', {toSocketId: info.socketId, offer})
            } catch (error) {
                console.warn('[WebRTC] Unable to create offer', error)
            }
        }

        socket.on('connect', join)
        socket.on('room-state', applyRoomState)
        socket.on('participant-joined', offerToPeer)
        socket.on('participant-reconnected', offerToPeer)
        socket.on('user-connected', offerToPeer)
        socket.on('participant-left', ({socketId}: { socketId: string }) => closePeer(socketId))
        socket.on('reaction', applyReaction)
        socket.on('room-ended', () => setRoomEnded(true))

        socket.on('webrtc-offer', async ({fromSocketId, offer}) => {
            const peer = createPeerConnection(fromSocketId, socket)
            try {
                await peer.setRemoteDescription(new RTCSessionDescription(offer))
                await flushIceCandidates(fromSocketId, peer)
                const answer = await peer.createAnswer()
                await peer.setLocalDescription(answer)
                socket.emit('webrtc-answer', {toSocketId: fromSocketId, answer})
            } catch (error) {
                console.warn('[WebRTC] Unable to handle offer', error)
            }
        })
        socket.on('webrtc-answer', async ({fromSocketId, answer}) => {
            const peer = peersRef.current[fromSocketId]
            if (!peer) return
            try {
                await peer.setRemoteDescription(new RTCSessionDescription(answer))
                await flushIceCandidates(fromSocketId, peer)
            } catch (error) {
                console.warn('[WebRTC] Unable to handle answer', error)
            }
        })
        socket.on('ice-candidate', async ({fromSocketId, candidate}) => {
            const peer = peersRef.current[fromSocketId]
            if (!peer || !peer.remoteDescription) {
                pendingIceRef.current[fromSocketId] ||= []
                pendingIceRef.current[fromSocketId].push(candidate)
                return
            }
            try {
                await peer.addIceCandidate(new RTCIceCandidate(candidate))
            } catch (error) {
                console.warn('[WebRTC] Unable to add ICE candidate', error)
            }
        })

        socket.connect()
        return () => {
            socket.emit('leave-room')
            socket.removeAllListeners()
            socket.disconnect()
            if (socketRef.current === socket) socketRef.current = null
            Object.keys(peerConnections).forEach(closePeer)
            participantSocketsRef.current = {}
        }
    }, [applyReaction, applyRoomState, closePeer, createPeerConnection, flushIceCandidates, localStream, roomId, shouldConnect, userInfo.userId])

    useEffect(() => {
        // Device switches are rare but must update existing connections without
        // rebuilding them. Audio/video sender identities remain stable.
        const stream = localStream
        if (!stream) return
        const audio = stream.getAudioTracks()[0]
        const video = stream.getVideoTracks()[0]
        Object.values(peersRef.current).forEach(peer => {
            const audioSender = peer.getSenders().find(sender => sender.track?.kind === 'audio')
            const videoSender = peer.getSenders().find(sender =>
                sender.track?.kind === 'video' && sender.track !== screenTrackRef.current)
            if (audio && audioSender?.track !== audio) void audioSender?.replaceTrack(audio)
            if (video && videoSender?.track !== video) void videoSender?.replaceTrack(video)
        })
    }, [localStream])

    const emitPatch = useCallback((patch: Record<string, boolean>) => {
        const socket = socketRef.current
        if (!socket?.connected) return
        const mutationId = `${participantIdRef.current}-${++mutationCounterRef.current}`
        socket.emit('update-room-state', {patch, mutationId, baseVersion: stateVersionRef.current},
            (result: { state?: RoomState } | undefined) => {
                if (result?.state) applyRoomState(result.state)
            })
    }, [applyRoomState])

    const emitMediaState = useCallback((isVideoMuted: boolean, isAudioMuted: boolean) => {
        emitPatch({isVideoMuted, isAudioMuted})
    }, [emitPatch])
    const emitHandState = useCallback((isHandRaised: boolean) => emitPatch({isHandRaised}), [emitPatch])
    const emitEnhancementState = useCallback((isEnhanced: boolean) => emitPatch({isEnhanced}), [emitPatch])
    const emitScreenShareState = useCallback((isScreenSharing: boolean) => emitPatch({isScreenSharing}), [emitPatch])
    const emitReaction = useCallback((emoji: string) => {
        const clientReactionId = `${participantIdRef.current}-${++mutationCounterRef.current}`
        socketRef.current?.emit('send-reaction', {emoji, clientReactionId})
    }, [])
    const endRoom = useCallback(() => socketRef.current?.emit('end-room'), [])
    const leaveRoom = useCallback(() => {
        socketRef.current?.emit('leave-room')
        socketRef.current?.disconnect()
    }, [])

    // Clean up remote screen streams when participants stop sharing
    useEffect(() => {
        const sharingIds = new Set(roomState.activeScreenShareIds)
        setRemoteScreenStreams(current => {
            const next = {...current}
            for (const [socketId, participant] of Object.entries(remoteParticipants)) {
                if (!sharingIds.has(participant.participantId)) {
                    delete next[socketId]
                }
            }
            return next
        })
    }, [roomState.activeScreenShareIds, remoteParticipants])

    const localParticipant = roomState.participants.find(item => item.participantId === userInfo.userId) ?? null

    useEffect(() => () => {
        Object.values(reactionTimersRef.current).forEach(clearTimeout)
    }, [])

    return {
        remoteStreams,
        remoteScreenStreams,
        remoteParticipants,
        remoteReactions,
        roomState,
        localParticipant,
        activeScreenShareIds: roomState.activeScreenShareIds,
        endRoom,
        leaveRoom,
        roomEnded,
        emitMediaState,
        emitHandState,
        emitEnhancementState,
        emitScreenShareState,
        emitReaction,
        replaceVideoTrack,
        addScreenTrack,
        removeScreenTrack,
    }
}
