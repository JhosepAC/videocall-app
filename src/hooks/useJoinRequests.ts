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
    const [status, setStatus] = useState<JoinRequest['status'] | null>(null)
    const [error, setError] = useState<string | null>(null)
    const requestIdRef = useRef<string | null>(null)
    const cleanupRef = useRef<(() => void) | null>(null)
    const generationRef = useRef(0)
    useEffect(() => () => { generationRef.current++; cleanupRef.current?.() }, [])

    const sendRequest = useCallback(async () => {
        cleanupRef.current?.()
        const generation = ++generationRef.current
        setError(null)
        setStatus(null)
        try {
            const supabase = createClient()
            const {data, error: insertError} = await supabase.from('join_requests').insert({
                room_id: roomId, guest_id: crypto.randomUUID(), guest_name: guestName.trim(), status: 'pending',
            }).select().single()
            if (insertError) throw new Error(insertError.message)
            if (generation !== generationRef.current) {
                await supabase.from('join_requests').delete().eq('id', data.id)
                return false
            }
            requestIdRef.current = data.id
            setStatus('pending')
            let active = true
            let settled = false
            const reconcile = async () => {
                if (!active || settled) return
                const {data: latest, error: readError} = await supabase.from('join_requests').select('status').eq('id', data.id).single()
                if (!active || generation !== generationRef.current || readError) return
                if (latest?.status === 'approved' || latest?.status === 'rejected') {
                    settled = true
                    setStatus(latest.status)
                }
            }
            const channel = supabase.channel(`join-request-${data.id}`).on('postgres_changes', {
                event: 'UPDATE', schema: 'public', table: 'join_requests', filter: `id=eq.${data.id}`,
            }, () => void reconcile()).subscribe(state => {
                // Also covers approval between INSERT and subscription, or a lost
                // update while Supabase Realtime was reconnecting.
                if (state === 'SUBSCRIBED') void reconcile()
            })
            const poll = setInterval(() => void reconcile(), 3000)
            void reconcile()
            cleanupRef.current = () => { active = false; clearInterval(poll); void supabase.removeChannel(channel) }
            return true
        } catch (err) {
            if (generation === generationRef.current) setError(err instanceof Error ? err.message : 'Failed to send request')
            return false
        }
    }, [roomId, guestName])
    const cancelRequest = useCallback(async () => {
        generationRef.current++
        cleanupRef.current?.()
        cleanupRef.current = null
        const id = requestIdRef.current
        requestIdRef.current = null
        setStatus(null)
        setError(null)
        if (id) await createClient().from('join_requests').delete().eq('id', id).eq('status', 'pending')
    }, [])
    return {status, error, sendRequest, cancelRequest}
}

export function useHostRequests(roomId: string | null) {
    const [requests, setRequests] = useState<JoinRequest[]>([])
    const [error, setError] = useState<string | null>(null)
    useEffect(() => {
        if (!roomId) return
        const supabase = createClient()
        let active = true
        let revision = 0
        const reconcile = async () => {
            const current = ++revision
            const {data, error: readError} = await supabase.from('join_requests').select('*').eq('room_id', roomId).eq('status', 'pending').order('created_at')
            if (!active || current !== revision) return
            if (readError) { setError(readError.message); return }
            setError(null)
            setRequests(data || [])
        }
        const channel = supabase.channel(`join-requests-${roomId}`).on('postgres_changes', {
            event: '*', schema: 'public', table: 'join_requests', filter: `room_id=eq.${roomId}`,
        }, () => void reconcile()).subscribe(state => { if (state === 'SUBSCRIBED') void reconcile() })
        void reconcile()
        const poll = setInterval(() => void reconcile(), 5000)
        return () => { active = false; clearInterval(poll); void supabase.removeChannel(channel) }
    }, [roomId])
    const decide = useCallback(async (requestId: string, status: 'approved' | 'rejected') => {
        if (!roomId) return
        try {
            const {error: updateError, data} = await createClient().from('join_requests')
                .update({status, updated_at: new Date().toISOString()}).eq('id', requestId).eq('room_id', roomId).eq('status', 'pending').select('id')
            if (updateError) throw new Error(updateError.message)
            if (!data?.length) throw new Error('Request could not be updated. Refresh and try again.')
            setRequests(current => current.filter(request => request.id !== requestId))
            setError(null)
        } catch (err) { setError(err instanceof Error ? err.message : 'Failed to update request') }
    }, [roomId])
    return {requests: roomId ? requests : [], error: roomId ? error : null,
        approveRequest: (id: string) => decide(id, 'approved'), rejectRequest: (id: string) => decide(id, 'rejected')}
}
