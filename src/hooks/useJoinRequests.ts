'use client'

import {useCallback, useEffect, useRef, useState} from 'react'
import {createClient} from '@/lib/supabase/client'

export interface JoinRequest {
    id: string
    room_id: string
    guest_id: string
    guest_name: string
    status: 'pending' | 'approved' | 'rejected'
    created_at: string
}

export function useGuestRequest(roomId: string, guestName: string) {
    const [status, setStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null)
    const [error, setError] = useState<string | null>(null)
    const requestIdRef = useRef<string | null>(null)
    const cleanupRef = useRef<(() => void) | null>(null)

    useEffect(() => {
        return () => {
            if (cleanupRef.current) {
                cleanupRef.current()
                cleanupRef.current = null
            }
        }
    }, [])

    const sendRequest = useCallback(async () => {
        if (cleanupRef.current) {
            cleanupRef.current()
            cleanupRef.current = null
        }

        try {
            const supabase = createClient()
            const guestId = crypto.randomUUID()

            const {data, error: insertError} = await supabase
                .from('join_requests')
                .insert({
                    room_id: roomId,
                    guest_id: guestId,
                    guest_name: guestName,
                    status: 'pending',
                })
                .select()
                .single()

            if (insertError) throw insertError

            requestIdRef.current = data.id
            setStatus('pending')

            const channel = supabase
                .channel(`join-request-${data.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'join_requests',
                        filter: `id=eq.${data.id}`,
                    },
                    (payload: any) => {
                        const newStatus = payload.new?.status
                        if (newStatus === 'approved' || newStatus === 'rejected') {
                            setStatus(newStatus)
                        }
                    }
                )
                .subscribe()

            cleanupRef.current = () => {
                supabase.removeChannel(channel)
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to send request')
        }
    }, [roomId, guestName])

    const cancelRequest = useCallback(async () => {
        if (cleanupRef.current) {
            cleanupRef.current()
            cleanupRef.current = null
        }
        if (!requestIdRef.current) return
        try {
            const supabase = createClient()
            await supabase
                .from('join_requests')
                .delete()
                .eq('id', requestIdRef.current)
            requestIdRef.current = null
            setStatus(null)
        } catch {
            // silently fail
        }
    }, [])

    return {status, error, sendRequest, cancelRequest}
}

export function useHostRequests(roomId: string | null) {
    const [requests, setRequests] = useState<JoinRequest[]>([])

    useEffect(() => {
        if (!roomId) return

        const supabase = createClient()

        supabase
            .from('join_requests')
            .select('*')
            .eq('room_id', roomId)
            .eq('status', 'pending')
            .then(({data}) => {
                if (data) {
                    setRequests(data)
                }
            })

        const channel = supabase
            .channel(`join-requests-${roomId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'join_requests',
                    filter: `room_id=eq.${roomId}`,
                },
                (payload: any) => {
                    if (payload.new?.status === 'pending') {
                        setRequests(prev => [...prev, payload.new as JoinRequest])
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'join_requests',
                    filter: `room_id=eq.${roomId}`,
                },
                (payload: any) => {
                    setRequests(prev => prev.filter(r => r.id !== payload.old?.id))
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [roomId])

    const approveRequest = useCallback(async (requestId: string) => {
        try {
            const supabase = createClient()
            await supabase
                .from('join_requests')
                .update({status: 'approved', updated_at: new Date().toISOString()})
                .eq('id', requestId)
            setRequests(prev => prev.filter(r => r.id !== requestId))
        } catch {
            // silently fail
        }
    }, [])

    const rejectRequest = useCallback(async (requestId: string) => {
        try {
            const supabase = createClient()
            await supabase
                .from('join_requests')
                .update({status: 'rejected', updated_at: new Date().toISOString()})
                .eq('id', requestId)
            setRequests(prev => prev.filter(r => r.id !== requestId))
        } catch {
            // silently fail
        }
    }, [])

    return {requests, approveRequest, rejectRequest}
}
