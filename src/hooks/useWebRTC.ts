import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

const SIGNALING_SERVER = process.env.NEXT_PUBLIC_SIGNALING_SERVER_URL || 'http://localhost:3001'

// Free STUN servers provided by Google for NAT traversal
const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
}

interface UseWebRTCReturn {
    remoteStreams: Record<string, MediaStream>
}

export function useWebRTC(roomId: string, localStream: MediaStream | null): UseWebRTCReturn {
    const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({})

    // Refs to maintain state without triggering re-renders
    const socketRef = useRef<Socket | null>(null)
    const peersRef = useRef<Record<string, RTCPeerConnection>>({})

    // Helper to create a new RTCPeerConnection and bind local tracks
    const createPeerConnection = useCallback((peerId: string, socket: Socket) => {
        const pc = new RTCPeerConnection(ICE_SERVERS)

        // Add local stream tracks to the connection
        if (localStream) {
            localStream.getTracks().forEach((track) => {
                pc.addTrack(track, localStream)
            })
        }

        // Handle receiving remote tracks
        pc.ontrack = (event) => {
            setRemoteStreams((prev) => ({
                ...prev,
                [peerId]: event.streams[0],
            }))
        }

        // Send ICE candidates to the specific peer via signaling server
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
        // Only connect if we have a valid local stream to share
        if (!localStream) return

        // Initialize Socket.io connection
        const socket = io(SIGNALING_SERVER)
        socketRef.current = socket

        // 1. Join Room
        socket.emit('join-room', { roomId, userId: 'user-' + Math.random().toString(36).substring(7) })

        // 2. New user joined -> We create an Offer
        socket.on('user-connected', async ({ socketId }) => {
            console.log(`[WebRTC] User connected: ${socketId}, creating offer...`)
            const pc = createPeerConnection(socketId, socket)
            peersRef.current[socketId] = pc

            try {
                const offer = await pc.createOffer()
                await pc.setLocalDescription(offer)
                socket.emit('webrtc-offer', { toSocketId: socketId, offer })
            } catch (error) {
                console.error('[WebRTC] Error creating offer:', error)
            }
        })

        // 3. Receive Offer -> We create an Answer
        socket.on('webrtc-offer', async ({ fromSocketId, offer }) => {
            console.log(`[WebRTC] Received offer from: ${fromSocketId}, creating answer...`)
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

        // 4. Receive Answer -> Finalize connection
        socket.on('webrtc-answer', async ({ fromSocketId, answer }) => {
            console.log(`[WebRTC] Received answer from: ${fromSocketId}`)
            const pc = peersRef.current[fromSocketId]
            if (pc) {
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(answer))
                } catch (error) {
                    console.error('[WebRTC] Error setting remote description:', error)
                }
            }
        })

        // 5. Receive ICE Candidate -> Add to PeerConnection
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

        // 6. User disconnects -> Cleanup their connection and remove their video
        socket.on('user-disconnected', ({ socketId }) => {
            console.log(`[WebRTC] User disconnected: ${socketId}`)
            if (peersRef.current[socketId]) {
                peersRef.current[socketId].close()
                delete peersRef.current[socketId]
            }
            setRemoteStreams((prev) => {
                const newStreams = { ...prev }
                delete newStreams[socketId]
                return newStreams
            })
        })

        // Cleanup on unmount
        return () => {
            socket.disconnect()
            Object.values(peersRef.current).forEach((pc) => pc.close())
            peersRef.current = {}
        }
    }, [localStream, roomId, createPeerConnection])

    return { remoteStreams }
}