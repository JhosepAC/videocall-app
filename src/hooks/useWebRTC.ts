import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

const SIGNALING_SERVER = process.env.NEXT_PUBLIC_SIGNALING_SERVER_URL || 'http://localhost:3001'

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
}

export interface ParticipantInfo {
    socketId: string
    userId: string
    fullName: string
    username: string
    avatarUrl: string | null
    isVideoMuted: boolean
    isAudioMuted: boolean
    isHandRaised: boolean
}

export interface ReactionEvent {
    socketId: string
    emoji: string
    id: string
    x: number
    y: number
    size: number
}

export function useWebRTC(
    roomId: string,
    localStream: MediaStream | null,
    screenTrack: MediaStreamTrack | null,
    userInfo: { userId: string, fullName: string, username: string, avatarUrl: string | null, isVideoMuted: boolean, isAudioMuted: boolean },
    isHandRaised: boolean
) {
    const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({})
    const [remoteParticipants, setRemoteParticipants] = useState<Record<string, ParticipantInfo>>({})
    const [remoteReactions, setRemoteReactions] = useState<ReactionEvent[]>([])
    const [roomEnded, setRoomEnded] = useState(false)

    const socketRef = useRef<Socket | null>(null)
    const peersRef = useRef<Record<string, RTCPeerConnection>>({})
    const screenTrackRef = useRef<MediaStreamTrack | null>(null)
    screenTrackRef.current = screenTrack

    const replaceVideoTrack = useCallback((newVideoTrack: MediaStreamTrack) => {
        Object.values(peersRef.current).forEach(pc => {
            const sender = pc.getSenders().find(s => s.track?.kind === 'video')
            if (sender) {
                sender.replaceTrack(newVideoTrack)
            }
        })
    }, [])

    const emitMediaState = useCallback((isVideoMuted: boolean, isAudioMuted: boolean) => {
        if (socketRef.current) {
            socketRef.current.emit('media-state-change', { isVideoMuted, isAudioMuted })
        }
    }, [])

    const emitHandState = useCallback((isHandRaised: boolean) => {
        if (socketRef.current) {
            socketRef.current.emit('hand-state-change', { isHandRaised })
        }
    }, [])

    const emitReaction = useCallback((emoji: string) => {
        if (socketRef.current) {
            socketRef.current.emit('send-reaction', { emoji })
        }
    }, [])

    const createPeerConnection = useCallback((peerId: string, socket: Socket) => {
        const pc = new RTCPeerConnection(ICE_SERVERS)

        if (localStream) {
            localStream.getTracks().forEach((track) => {
                pc.addTrack(track, localStream)
            })
        }

        if (screenTrackRef.current) {
            const sender = pc.getSenders().find(s => s.track?.kind === 'video')
            if (sender) {
                sender.replaceTrack(screenTrackRef.current)
            }
        }

        pc.ontrack = (event) => {
            setRemoteStreams((prev) => ({
                ...prev,
                [peerId]: event.streams[0],
            }))
        }

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice-candidate', {
                    toSocketId: peerId,
                    candidate: event.candidate,
                })
            }
        }

        return pc
    }, [localStream])

    useEffect(() => {
        if (!localStream) return

        const socket = io(SIGNALING_SERVER)
        socketRef.current = socket

        socket.emit('join-room', { roomId, ...userInfo, isHandRaised: false })

        socket.on('room-participants', ({ participants }) => {
            const participantsMap: Record<string, ParticipantInfo> = {}
            participants.forEach((p: ParticipantInfo) => {
                participantsMap[p.socketId] = p
            })
            setRemoteParticipants(participantsMap)
        })

        socket.on('user-connected', async (info: ParticipantInfo) => {
            setRemoteParticipants(prev => ({ ...prev, [info.socketId]: info }))
            const pc = createPeerConnection(info.socketId, socket)
            peersRef.current[info.socketId] = pc

            try {
                const offer = await pc.createOffer()
                await pc.setLocalDescription(offer)
                socket.emit('webrtc-offer', { toSocketId: info.socketId, offer })
            } catch (error) {
                console.error('[WebRTC] Error creating offer:', error)
            }
        })

        socket.on('peer-media-state', ({ socketId, isVideoMuted, isAudioMuted }) => {
            setRemoteParticipants(prev => {
                if (!prev[socketId]) return prev
                return {
                    ...prev,
                    [socketId]: { ...prev[socketId], isVideoMuted, isAudioMuted }
                }
            })
        })

        socket.on('peer-hand-state', ({ socketId, isHandRaised }) => {
            setRemoteParticipants(prev => {
                if (!prev[socketId]) return prev
                return {
                    ...prev,
                    [socketId]: { ...prev[socketId], isHandRaised }
                }
            })
        })

        socket.on('peer-reaction', ({ socketId, emoji }) => {
            const id = `${socketId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
            const x = Math.floor(Math.random() * 160) - 80
            const y = Math.floor(Math.random() * 120)
            const size = Math.random() < 0.2 ? Math.floor(Math.random() * 10) + 32 : 44
            setRemoteReactions(prev => [...prev, { socketId, emoji, id, x, y, size }])
            setTimeout(() => {
                setRemoteReactions(prev => prev.filter(r => r.id !== id))
            }, 4000)
        })

        socket.on('webrtc-offer', async ({ fromSocketId, offer }) => {
            const pc = createPeerConnection(fromSocketId, socket)
            peersRef.current[fromSocketId] = pc

            try {
                await pc.setRemoteDescription(new RTCSessionDescription(offer))
                const answer = await pc.createAnswer()
                await pc.setLocalDescription(answer)
                socket.emit('webrtc-answer', { toSocketId: fromSocketId, answer })
            } catch (error) {
                console.error('[WebRTC] Error handling offer:', error)
            }
        })

        socket.on('webrtc-answer', async ({ fromSocketId, answer }) => {
            const pc = peersRef.current[fromSocketId]
            if (pc) {
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(answer))
                } catch (error) {
                    console.error('[WebRTC] Error setting remote description:', error)
                }
            }
        })

        socket.on('ice-candidate', async ({ fromSocketId, candidate }) => {
            const pc = peersRef.current[fromSocketId]
            if (pc && candidate) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate))
                } catch (error) {
                    console.error('[WebRTC] Error adding ICE candidate:', error)
                }
            }
        })

        socket.on('user-disconnected', ({ socketId }) => {
            if (peersRef.current[socketId]) {
                peersRef.current[socketId].close()
                delete peersRef.current[socketId]
            }
            setRemoteStreams((prev) => {
                const newStreams = { ...prev }
                delete newStreams[socketId]
                return newStreams
            })
            setRemoteParticipants((prev) => {
                const newParts = { ...prev }
                delete newParts[socketId]
                return newParts
            })
        })

        socket.on('room-ended', () => {
            setRoomEnded(true)
        })

        return () => {
            socket.disconnect()
            Object.values(peersRef.current).forEach((pc) => pc.close())
            peersRef.current = {}
        }
    }, [localStream, roomId, screenTrack, createPeerConnection, userInfo])

    const endRoom = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.emit('end-room')
        }
    }, [])

    return { remoteStreams, remoteParticipants, remoteReactions, endRoom, roomEnded, emitMediaState, emitHandState, emitReaction, replaceVideoTrack }
}