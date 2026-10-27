'use client'

import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {useRouter} from 'next/navigation'
import Link from 'next/link'
import {AlertCircle, Check, ChevronLeft, ChevronRight, Copy, Hand, Loader2, MessageSquare,
    Mic, MicOff, MonitorUp, Palette, PhoneOff, Pin, RotateCcw, Send, Share2, SmilePlus, Users, Video, VideoOff, Wifi, WifiOff, X} from 'lucide-react'
import type {LucideIcon} from 'lucide-react'
import {useI18n} from '@/components/i18n/i18n-provider'
import {useLocalMediaStream} from '@/hooks/useLocalMediaStream'
import {DEFAULT_ENHANCEMENT, useVideoEnhancer} from '@/hooks/useVideoEnhancer'
import type {EnhancementConfig} from '@/hooks/useVideoEnhancer'
import {useWebRTC} from '@/hooks/useWebRTC'
import type {ParticipantInfo} from '@/hooks/useWebRTC'
import {useHostRequests} from '@/hooks/useJoinRequests'
import {createClient} from '@/lib/supabase/client'
import {EMOJI_LIST, getEmojiUrl} from '@/lib/emojis'
import GuestLobby from './GuestLobby'
import './room.css'

type Panel = 'people' | 'chat' | 'effects' | null
const PAGE_SIZE = 9

function MeetingVideo({stream, name, avatar, videoOff, audioOff, hand, local = false, screen = false, status, host = false}: {
    stream?: MediaStream | null; name: string; avatar?: string | null; videoOff?: boolean; audioOff?: boolean;
    hand?: boolean; local?: boolean; screen?: boolean; status?: string; host?: boolean
}) {
    const ref = useRef<HTMLVideoElement>(null)
    const {locale} = useI18n()
    const es = locale === 'es'
    useEffect(() => {
        const video = ref.current
        if (!video) return
        video.srcObject = stream || null
        if (stream) void video.play().catch(() => {})
        return () => { video.srcObject = null }
    }, [stream])
    const waiting = !stream || (!local && status !== 'connected')
    const initials = name.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase()
    return <article className={`meeting-tile ${screen ? 'meeting-presentation' : ''}`} data-local={local} data-hand={Boolean(hand)} data-peer-state={status} aria-label={name}>
        <video ref={ref} autoPlay playsInline muted className={`${local && !screen ? 'meeting-mirror' : ''} ${videoOff || waiting ? 'meeting-video-hidden' : ''}`}/>
        {(videoOff || waiting) && <div className="meeting-avatar">
            {waiting && !local ? <><Loader2 className="meeting-spinner" size={26}/><span>{es ? 'Conectando' : 'Connecting'}</span></> :
                avatar ? <img src={avatar} alt=""/> : <span className="meeting-initials">{initials || 'M'}</span>}
        </div>}
        <div className="meeting-tile-meta">
            <span className="meeting-name">{name}{local && <span> · {es ? 'Tú' : 'You'}</span>}{host && <span> · {es ? 'Anfitrión' : 'Host'}</span>}</span>
            <span className="meeting-tile-states">
                {hand && <Hand size={16} className="meeting-hand" aria-label={es ? 'Mano levantada' : 'Hand raised'}/>}
                {audioOff && !screen && <MicOff size={16} aria-label={es ? 'Micrófono apagado' : 'Microphone off'}/>}
            </span>
        </div>
    </article>
}

// Audio has one persistent owner per participant, independent of the visible
// tile, pagination, presentation layout or collapsed participant strip.
function RemoteAudio({stream, onBlocked}: {stream: MediaStream; onBlocked: () => void}) {
    const ref = useRef<HTMLAudioElement>(null)
    useEffect(() => {
        const audio = ref.current
        if (!audio) return
        audio.srcObject = stream
        void audio.play().catch(onBlocked)
        return () => { audio.srcObject = null }
    }, [stream, onBlocked])
    return <audio ref={ref} autoPlay data-remote-audio/>
}

function Control({icon: Icon, label, compactLabel, onClick, active, danger, disabled, badge}: {
    icon: LucideIcon; label: string; compactLabel?: string; onClick: () => void; active?: boolean; danger?: boolean; disabled?: boolean; badge?: number
}) {
    return <button className={`meeting-control ${danger ? 'meeting-danger' : ''}`} onClick={onClick} disabled={disabled}
        aria-label={label} title={label} aria-pressed={active} data-active={active}>
        <span className="meeting-control-icon"><Icon size={21}/>{Boolean(badge) && <span className="meeting-badge">{badge}</span>}</span>
        <span className="meeting-control-label"><span className="meeting-label-wide">{label}</span><span className="meeting-label-small">{compactLabel || label}</span></span>
    </button>
}

const SLIDERS: {key: keyof Omit<EnhancementConfig, 'enabled' | 'autoWhiteBalance'>; es: string; en: string; min: number; max: number}[] = [
    {key: 'whiteBalance', es: 'Temperatura', en: 'Temperature', min: -1, max: 1},
    {key: 'brightness', es: 'Brillo', en: 'Brightness', min: -0.5, max: 0.5},
    {key: 'contrast', es: 'Contraste', en: 'Contrast', min: 0.5, max: 2},
    {key: 'saturation', es: 'Saturación', en: 'Saturation', min: 0, max: 2},
    {key: 'gamma', es: 'Gamma', en: 'Gamma', min: 0.5, max: 2.5},
    {key: 'sharpness', es: 'Nitidez', en: 'Sharpness', min: 0, max: 1.5},
    {key: 'denoise', es: 'Reducción de ruido', en: 'Noise reduction', min: 0, max: 1},
]

export default function RoomClient({roomId}: {roomId: string}) {
    const router = useRouter()
    const {locale, t} = useI18n()
    const es = locale === 'es'
    const media = useLocalMediaStream()
    const [profile, setProfile] = useState<{userId: string; fullName: string; username: string; avatarUrl: string | null} | null>(null)
    const [auth, setAuth] = useState<'loading' | 'member' | 'guest' | 'error'>('loading')
    const [guest, setGuest] = useState<{userId: string; fullName: string; username: string; avatarUrl: string | null} | null>(null)
    const [hand, setHand] = useState(false)
    const [panel, setPanel] = useState<Panel>(null)
    const [page, setPage] = useState(0)
    const [pinned, setPinned] = useState<string | null>(null)
    const [collapsed, setCollapsed] = useState(false)
    const [config, setConfig] = useState<EnhancementConfig>({...DEFAULT_ENHANCEMENT})
    const [reactionsOpen, setReactionsOpen] = useState(false)
    const [draft, setDraft] = useState('')
    const [sending, setSending] = useState(false)
    const [readSequence, setReadSequence] = useState(0)
    const [notice, setNotice] = useState('')
    const [audioBlocked, setAudioBlocked] = useState(false)
    const [now, setNow] = useState(() => Date.now())
    const [startedAt] = useState(() => Date.now())
    const pickerRef = useRef<HTMLDivElement>(null)
    const panelRef = useRef<HTMLElement>(null)
    const panelTriggerRef = useRef<HTMLElement | null>(null)
    const chatEndRef = useRef<HTMLDivElement>(null)
    const shareBusy = useRef(false)
    const previousParticipants = useRef(new Map<string, ParticipantInfo>())
    const {enhancedTrack, error: enhancementError} = useVideoEnhancer(config.enabled ? media.localStream : null, config)
    const identity = guest || profile
    const userInfo = useMemo(() => ({
        userId: identity?.userId || '', fullName: identity?.fullName || '', username: identity?.username || '', avatarUrl: identity?.avatarUrl || null,
        isVideoMuted: media.isVideoStopped, isAudioMuted: media.isAudioMuted, isEnhanced: Boolean(config.enabled && enhancedTrack),
    }), [identity, media.isVideoStopped, media.isAudioMuted, config.enabled, enhancedTrack])
    const screenTrack = media.screenStream?.getVideoTracks()[0] || null
    const call = useWebRTC(roomId, media.localStream, screenTrack, userInfo, hand, Boolean(identity))
    const closePanel = useCallback(() => {
        setReadSequence(call.messages.at(-1)?.sequence || 0)
        setPanel(null)
        panelTriggerRef.current?.focus()
    }, [call.messages])
    const {requests, approveRequest, rejectRequest, error: requestError} = useHostRequests(auth === 'member' && call.localParticipant?.isHost ? roomId : null)
    const outgoingTrack = config.enabled && enhancedTrack ? enhancedTrack : media.localStream?.getVideoTracks()[0]
    useEffect(() => {
        if (outgoingTrack) {
            outgoingTrack.enabled = !media.isVideoStopped
            call.replaceVideoTrack(outgoingTrack)
        }
    }, [outgoingTrack, media.isVideoStopped, call.replaceVideoTrack])
    const localDisplay = useMemo(() => outgoingTrack ? new MediaStream([outgoingTrack]) : media.localStream, [outgoingTrack, media.localStream])

    useEffect(() => {
        let active = true
        const load = async () => {
            try {
                const supabase = createClient()
                const {data: {user}, error} = await supabase.auth.getUser()
                if (!active) return
                if (error && error.name !== 'AuthSessionMissingError') throw error
                if (!user) { setAuth('guest'); return }
                const {data} = await supabase.from('profiles').select('full_name, username, avatar_url').eq('id', user.id).single()
                if (!active) return
                setProfile({userId: user.id, fullName: data?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || (es ? 'Participante' : 'Participant'), username: data?.username || '', avatarUrl: data?.avatar_url || null})
                setAuth('member')
            } catch { if (active) setAuth('error') }
        }
        void load()
        return () => { active = false }
    }, [es])
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000)
        return () => clearInterval(timer)
    }, [])
    useEffect(() => {
        if (!notice) return
        const timer = setTimeout(() => setNotice(''), 5000)
        return () => clearTimeout(timer)
    }, [notice])
    useEffect(() => {
        const close = (event: KeyboardEvent) => {
            if (event.key === 'Escape') { closePanel(); setReactionsOpen(false) }
        }
        document.addEventListener('keydown', close)
        return () => document.removeEventListener('keydown', close)
    }, [closePanel])
    useEffect(() => {
        if (!panel) return
        panelRef.current?.focus()
    }, [panel])
    useEffect(() => {
        if (!reactionsOpen) return
        const close = (event: PointerEvent) => { if (!pickerRef.current?.contains(event.target as Node)) setReactionsOpen(false) }
        document.addEventListener('pointerdown', close)
        return () => document.removeEventListener('pointerdown', close)
    }, [reactionsOpen])
    useEffect(() => {
        if (panel === 'chat') chatEndRef.current?.scrollIntoView({block: 'end'})
    }, [call.messages, panel])
    useEffect(() => {
        if (call.roomEnded) router.push(auth === 'guest' ? '/' : '/dashboard')
    }, [call.roomEnded, router, auth])
    useEffect(() => {
        const previous = previousParticipants.current
        const next = new Map(call.roomState.participants.map(person => [person.participantId, person]))
        for (const [id, person] of next) {
            if (id === userInfo.userId) continue
            const old = previous.get(id)
            if (person.isHandRaised && !old?.isHandRaised) {
                setNotice(`${person.fullName} ${es ? 'levantó la mano' : 'raised their hand'}`)
                void new Audio('/sounds/raise-hand.mp3').play().catch(() => {})
            } else if (!old && previous.size) setNotice(`${person.fullName} ${es ? 'se unió a la reunión' : 'joined the meeting'}`)
            else if (old && !old.isConnected && person.isConnected) setNotice(`${person.fullName} ${es ? 'se reconectó' : 'reconnected'}`)
        }
        for (const [id, person] of previous) if (!next.has(id) && id !== userInfo.userId && next.size) setNotice(`${person.fullName} ${es ? 'salió de la reunión' : 'left the meeting'}`)
        previousParticipants.current = next
    }, [call.roomState, userInfo.userId, es])
    const previousRequests = useRef(0)
    useEffect(() => {
        if (requests.length > previousRequests.current) {
            setNotice(es ? 'Alguien espera para entrar. Revisa Participantes.' : 'Someone is waiting to join. Open People.')
            void new Audio('/sounds/application-participation.mp3').play().catch(() => {})
        }
        previousRequests.current = requests.length
    }, [requests, es])
    const onAudioBlocked = useCallback(() => setAudioBlocked(true), [])
    const openPanel = (next: Panel) => {
        panelTriggerRef.current = document.activeElement as HTMLElement
        setPanel(current => current === next ? null : next)
        if (next === 'chat' || panel === 'chat') setReadSequence(call.messages.at(-1)?.sequence || 0)
    }
    const copy = async (url: boolean) => {
        try { await navigator.clipboard.writeText(url ? window.location.href : roomId); setNotice(es ? 'Enlace copiado' : 'Copied to clipboard') }
        catch { setNotice(es ? 'No se pudo copiar el enlace. Cópialo desde la barra de direcciones.' : 'Could not copy. Copy the link from the address bar.') }
    }
    const toggleScreen = async () => {
        if (shareBusy.current) return
        if (media.isScreenSharing) { media.stopScreenShare(); return }
        shareBusy.current = true
        try {
            const track = await media.startScreenShare()
            if (!track) setNotice(es ? 'No se inició la presentación. Puedes volver a intentarlo.' : 'Presentation did not start. You can try again.')
        } finally { shareBusy.current = false }
    }
    const submitMessage = async (event: React.FormEvent) => {
        event.preventDefault()
        if (sending || !draft.trim()) return
        setSending(true)
        const body = draft.trim()
        const ok = await call.sendMessage(body)
        if (ok) setDraft('')
        else setNotice(es ? 'No se pudo confirmar el mensaje. El texto sigue aquí para reintentarlo.' : 'Message was not confirmed. Your text is here to retry.')
        setSending(false)
    }
    const leave = () => { media.stopScreenShare(); call.leaveRoom(); router.push(auth === 'guest' ? '/' : '/dashboard') }
    const endForEveryone = async () => {
        if (!window.confirm(es ? '¿Finalizar la reunión para todos?' : 'End the meeting for everyone?')) return
        if (!await call.endRoom()) setNotice(es ? 'No se pudo finalizar la reunión. Reintenta cuando se restablezca la conexión.' : 'Could not end the meeting. Retry when connected.')
    }

    if (auth === 'loading' || media.status === 'requesting') return <div className="meeting-room meeting-loading"><Loader2 className="meeting-spinner"/><h1>{t('room.loading_devices')}</h1><p>MeetMesh</p></div>
    if (auth === 'error' || media.status === 'error') return <div className="meeting-room meeting-loading"><AlertCircle/><h1>{es ? 'No pudimos preparar la reunión' : 'Could not prepare the meeting'}</h1><p>{media.errorMessage ? (es ? 'Comprueba los permisos de cámara y micrófono del navegador y que otra aplicación no los esté usando.' : media.errorMessage) : (es ? 'No se pudo verificar tu sesión.' : 'Could not verify your session.')}</p><button onClick={() => window.location.reload()}>{es ? 'Reintentar' : 'Try again'}</button>{media.status === 'error' && auth !== 'error' && <button onClick={media.joinWithoutDevices}>{es ? 'Entrar sin cámara ni micrófono' : 'Join without camera or microphone'}</button>}<Link href="/">{es ? 'Volver al inicio' : 'Back to home'}</Link></div>
    if (auth === 'guest' && !guest) return <div className="meeting-lobby"><GuestLobby roomId={roomId} localStream={media.localStream} status={media.status} errorMessage={media.errorMessage}
        isVideoStopped={media.isVideoStopped} isAudioMuted={media.isAudioMuted} toggleVideo={media.toggleVideo} toggleAudio={media.toggleAudio}
        onApproved={(name, avatar) => setGuest({userId: `guest-${crypto.randomUUID()}`, fullName: name, username: '', avatarUrl: avatar})} onRejected={() => setGuest(null)}/></div>

    const remotes = Object.values(call.remoteParticipants)
    const participants = call.roomState.participants
    const total = 1 + remotes.length
    const pages = Math.ceil(total / PAGE_SIZE)
    const safePage = Math.min(page, pages - 1)
    const tiles = [{id: userInfo.userId, local: true, person: call.localParticipant}, ...remotes.map(person => ({id: person.participantId, local: false, person}))]
    const visibleTiles = tiles.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)
    const shares = participants.filter(person => person.participantId === userInfo.userId ? media.isScreenSharing : person.isScreenSharing)
    const activePin = shares.some(person => person.participantId === pinned) ? pinned : null
    const mainShares = activePin ? shares.filter(person => person.participantId === activePin) : shares.slice(0, 2)
    const extraShares = shares.filter(person => !mainShares.includes(person))
    const seconds = Math.floor((now - startedAt) / 1000)
    const duration = `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
    const unread = panel === 'chat' ? 0 : call.messages.filter(message => message.sequence > readSequence && message.participantId !== userInfo.userId).length
    const connectionLabel = call.connectionStatus === 'connected' ? (es ? 'En la reunión' : 'In the meeting') : call.connectionStatus === 'connecting' ? (es ? 'Conectando' : 'Connecting') : (es ? 'Reconectando' : 'Reconnecting')
    const renderTile = (local: boolean, person: ParticipantInfo | null, id: string) => <MeetingVideo key={id}
        stream={local ? localDisplay : call.remoteStreams[person!.socketId]} name={local ? userInfo.fullName : person!.fullName || t('room.participant')}
        avatar={local ? userInfo.avatarUrl : person?.avatarUrl} local={local} host={person?.isHost}
        videoOff={local ? media.isVideoStopped : person?.isVideoMuted} audioOff={local ? media.isAudioMuted : person?.isAudioMuted}
        hand={local ? hand : person?.isHandRaised} status={local ? 'connected' : call.peerStates[person!.socketId] || (person?.isConnected ? 'connecting' : 'disconnected')}/>

    return <div className="meeting-room" lang={locale}>
        <header className="meeting-header">
            <Link className="meeting-brand" href="/" aria-label="MeetMesh"><svg width="29" height="24" viewBox="0 0 29 24" fill="none" aria-hidden="true"><rect x="1" y="2" width="18" height="18" rx="6" stroke="currentColor" strokeWidth="1.7"/><rect x="10" y="5" width="18" height="18" rx="6" stroke="currentColor" strokeWidth="1.7"/></svg><span>MeetMesh</span></Link>
            <div className="meeting-heading"><h1>{es ? 'Sala de reunión' : 'Meeting room'}</h1><button onClick={() => void copy(false)} title={es ? 'Copiar código' : 'Copy room code'}>{roomId}<Copy size={12}/></button></div>
            <div className="meeting-header-status" role="status" data-status={call.connectionStatus}><span className="meeting-status-dot"/>{connectionLabel}<span className="meeting-duration">{duration}</span></div>
            <button className="meeting-invite" onClick={() => void copy(true)}><Share2 size={16}/><span>{es ? 'Invitar' : 'Invite'}</span></button>
        </header>
        {call.connectionStatus !== 'connected' && <div className="meeting-connection-banner" role="status"><WifiOff size={16}/><span>{es ? 'Restableciendo la conexión. Tus controles se sincronizarán al volver.' : 'Restoring connection. Your controls will sync when reconnected.'}</span><button onClick={call.reconnect}>{es ? 'Reintentar' : 'Retry'}</button></div>}
        {call.connectionStatus === 'connected' && Object.values(call.peerStates).some(state => state === 'failed') && <div className="meeting-connection-banner" role="status"><WifiOff size={16}/><span>{es ? 'No se pudo recuperar una conexión de audio y video.' : 'An audio and video connection could not be recovered.'}</span><button onClick={call.reconnect}>{es ? 'Reconectar' : 'Reconnect'}</button></div>}
        {audioBlocked && <div className="meeting-connection-banner"><Mic size={16}/><button onClick={() => {
            void Promise.all(Array.from(document.querySelectorAll<HTMLAudioElement>('[data-remote-audio]')).map(audio => audio.play())).then(() => setAudioBlocked(false)).catch(() => {})
        }}>{es ? 'Haz clic para escuchar la reunión' : 'Click to hear the meeting'}</button></div>}
        <div className="meeting-body">
            <main className="meeting-main" aria-label={es ? 'Videos de la reunión' : 'Meeting videos'}>
                <div className="meeting-stage-heading"><span>{shares.length ? <MonitorUp size={15}/> : <Users size={15}/>}{shares.length ? (es ? 'Presentación en curso' : 'Presentation in progress') : `${es ? 'Participantes' : 'Participants'} · ${total}`}</span><span>{shares.length ? shares.map(person => person.fullName).join(', ') : es ? 'Un espacio para conversar' : 'A space for conversation'}</span></div>
                {shares.length ? <>
                    <div className="meeting-share-grid" data-count={mainShares.length}>{mainShares.map(person => <div className="meeting-share-wrap" key={person.participantId}>
                        <MeetingVideo stream={person.participantId === userInfo.userId ? media.screenStream : call.remoteScreenStreams[person.socketId]}
                            name={person.fullName} screen local={person.participantId === userInfo.userId} status={person.participantId === userInfo.userId ? 'connected' : call.peerStates[person.socketId]}/>
                        {shares.length > 1 && <button className="meeting-pin" aria-label={activePin === person.participantId ? (es ? 'Desfijar pantalla' : 'Unpin screen') : (es ? 'Fijar pantalla' : 'Pin screen')}
                            aria-pressed={activePin === person.participantId} onClick={() => setPinned(current => current === person.participantId ? null : person.participantId)}><Pin size={16}/></button>}
                    </div>)}</div>
                    {extraShares.length > 0 && <div className="meeting-extra-shares">{extraShares.map(person => <button key={person.participantId} onClick={() => setPinned(person.participantId)}><Pin size={13}/>{person.fullName}</button>)}</div>}
                    <button className="meeting-strip-toggle" onClick={() => setCollapsed(current => !current)}>{collapsed ? (es ? 'Mostrar participantes' : 'Show participants') : (es ? 'Ocultar participantes' : 'Hide participants')} · {total}</button>
                    {!collapsed && <div className="meeting-strip">{tiles.map(tile => renderTile(tile.local, tile.person, tile.id))}</div>}
                </> : <div className="meeting-video-grid" data-count={visibleTiles.length}>{visibleTiles.map(tile => renderTile(tile.local, tile.person, tile.id))}</div>}
                {total === 1 && !shares.length && <div className="meeting-alone"><span>{es ? 'La sala está lista. Invita a alguien a conversar.' : 'The room is ready. Invite someone to the conversation.'}</span><button onClick={() => void copy(true)}><Copy size={14}/>{es ? 'Copiar invitación' : 'Copy invite link'}</button></div>}
                {pages > 1 && !shares.length && <nav className="meeting-pagination" aria-label={es ? 'Páginas de participantes' : 'Participant pages'}><button disabled={!safePage} aria-label={es ? 'Página anterior' : 'Previous page'} onClick={() => setPage(safePage - 1)}><ChevronLeft size={18}/></button><span>{safePage + 1} / {pages}</span><button disabled={safePage === pages - 1} aria-label={es ? 'Página siguiente' : 'Next page'} onClick={() => setPage(safePage + 1)}><ChevronRight size={18}/></button></nav>}
            </main>
            {panel && <>
                <button className="meeting-panel-scrim" onClick={closePanel} aria-label={es ? 'Cerrar panel' : 'Close panel'}/>
                <aside className="meeting-panel" ref={panelRef} tabIndex={-1} aria-label={panel === 'chat' ? 'Chat' : panel === 'people' ? t('room.participants') : t('room.enhance_title')}>
                    <div className="meeting-panel-header"><h2>{panel === 'chat' ? (es ? 'Chat de la reunión' : 'Meeting chat') : panel === 'people' ? `${t('room.participants')} · ${total}` : (es ? 'Ajustes de imagen' : 'Image settings')}</h2><button aria-label={es ? 'Cerrar panel' : 'Close panel'} onClick={closePanel}><X size={19}/></button></div>
                    {panel === 'people' && <div className="meeting-panel-scroll">
                        <p className="meeting-panel-description">{es ? 'En esta conversación' : 'In this conversation'}</p>
                        <ul className="meeting-people">{tiles.map(({id, local, person}) => <li key={id} data-participant-id={id} data-audio-muted={local ? media.isAudioMuted : person?.isAudioMuted} data-video-muted={local ? media.isVideoStopped : person?.isVideoMuted} data-hand-raised={local ? hand : person?.isHandRaised}>
                            <span className="meeting-person-avatar">{(local ? userInfo.avatarUrl : person?.avatarUrl) ? <img src={(local ? userInfo.avatarUrl : person?.avatarUrl)!} alt=""/> : (local ? userInfo.fullName : person?.fullName)?.slice(0, 1).toUpperCase()}</span>
                            <span className="meeting-person-name"><strong>{local ? userInfo.fullName : person?.fullName}{local && ` (${es ? 'tú' : 'you'})`}</strong><small>{!local && !person?.isConnected ? (es ? 'Reconectando…' : 'Reconnecting…') : person?.isHost ? (es ? 'Anfitrión' : 'Host') : (es ? 'Participante' : 'Participant')}</small></span>
                            {(local ? hand : person?.isHandRaised) && <Hand size={16} className="meeting-hand"/>}
                            {(local ? media.isAudioMuted : person?.isAudioMuted) ? <MicOff size={16}/> : <Mic size={16}/>}
                            {(local ? media.isVideoStopped : person?.isVideoMuted) ? <VideoOff size={16}/> : <Video size={16}/>}
                        </li>)}</ul>
                        {requestError && <p className="meeting-error" role="alert">{requestError}</p>}
                        {requests.length > 0 && <section className="meeting-requests"><h3>{es ? 'Esperando para entrar' : 'Waiting to join'} · {requests.length}</h3>{requests.map(request => <div key={request.id}><strong>{request.guest_name}</strong><div><button onClick={() => void rejectRequest(request.id)}>{es ? 'Rechazar' : 'Decline'}</button><button onClick={() => void approveRequest(request.id)}>{es ? 'Admitir' : 'Admit'}</button></div></div>)}</section>}
                        <button className="meeting-panel-action" onClick={() => void copy(true)}><Share2 size={16}/>{es ? 'Compartir invitación' : 'Share invitation'}</button>
                        {call.localParticipant?.isHost && <button className="meeting-end-all" disabled={call.connectionStatus !== 'connected'} onClick={() => void endForEveryone()}><PhoneOff size={16}/>{es ? 'Finalizar para todos' : 'End for everyone'}</button>}
                    </div>}
                    {panel === 'chat' && <>
                        <p className="meeting-panel-description meeting-chat-description">{es ? 'Los mensajes son visibles para todos y se conservan mientras la sala está activa.' : 'Messages are visible to everyone and kept while the room is active.'}</p>
                        <div className="meeting-chat-messages" role="log" aria-label={es ? 'Mensajes' : 'Messages'} aria-live="polite">
                            {!call.messages.length && <div className="meeting-chat-empty"><MessageSquare size={27}/><h3>{es ? 'La conversación sigue aquí' : 'Keep the conversation going'}</h3><p>{es ? 'Comparte una idea, un enlace o una pregunta con la sala.' : 'Share an idea, a link or a question with the room.'}</p></div>}
                            {call.messages.map(message => <article key={message.id} className="meeting-message" data-own={message.participantId === userInfo.userId}><div><strong>{message.fullName || (es ? 'Participante' : 'Participant')}</strong><time dateTime={new Date(message.createdAt).toISOString()}>{new Date(message.createdAt).toLocaleTimeString(locale, {hour: '2-digit', minute: '2-digit'})}</time></div><p>{message.body}</p></article>)}<div ref={chatEndRef}/>
                        </div>
                        <form className="meeting-composer" onSubmit={event => void submitMessage(event)}><label className="sr-only" htmlFor="meeting-message">{es ? 'Escribe un mensaje' : 'Write a message'}</label><textarea id="meeting-message" placeholder={es ? 'Escribe un mensaje…' : 'Write a message…'} value={draft} onChange={event => setDraft(event.target.value)} maxLength={4000} disabled={sending} rows={2}
                            onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {event.preventDefault(); event.currentTarget.form?.requestSubmit()} }}/><div><small>{es ? 'Enter para enviar · Mayús + Enter para nueva línea' : 'Enter to send · Shift + Enter for a new line'}</small><button type="submit" aria-label={es ? 'Enviar mensaje' : 'Send message'} disabled={sending || !draft.trim() || call.connectionStatus !== 'connected'}>{sending ? <Loader2 size={17} className="meeting-spinner"/> : <Send size={17}/>}</button></div></form>
                    </>}
                    {panel === 'effects' && <div className="meeting-panel-scroll meeting-effects"><p className="meeting-panel-description">{es ? 'Ajusta tu cámara. Los demás verán la misma imagen.' : 'Adjust your camera. Everyone sees the same image.'}</p>
                        <label className="meeting-switch"><span>{es ? 'Mejorar imagen' : 'Enhance image'}</span><input type="checkbox" checked={config.enabled} disabled={!media.localStream?.getVideoTracks().length} onChange={event => setConfig(current => ({...current, enabled: event.target.checked}))}/></label>
                        {enhancementError && <p className="meeting-error" role="status">{es ? 'La mejora no está disponible en este navegador. Se sigue enviando tu cámara original.' : enhancementError}</p>}
                        <fieldset disabled={!config.enabled}><label className="meeting-switch"><span>{es ? 'Balance de blancos automático' : 'Auto white balance'}</span><input type="checkbox" checked={config.autoWhiteBalance} onChange={event => setConfig(current => ({...current, autoWhiteBalance: event.target.checked}))}/></label>
                            {SLIDERS.map(slider => <label className="meeting-slider" key={slider.key}><span>{es ? slider.es : slider.en}<output>{config[slider.key].toFixed(2)}</output></span><input type="range" min={slider.min} max={slider.max} step={0.05} value={config[slider.key]} disabled={slider.key === 'whiteBalance' && config.autoWhiteBalance} onChange={event => setConfig(current => ({...current, [slider.key]: Number(event.target.value)}))}/></label>)}
                        </fieldset><button className="meeting-panel-action" onClick={() => setConfig({...DEFAULT_ENHANCEMENT, enabled: config.enabled})}><RotateCcw size={15}/>{es ? 'Restablecer ajustes' : 'Reset adjustments'}</button>
                    </div>}
                </aside>
            </>}
        </div>
        <footer className="meeting-footer">
            <div className="meeting-footer-info"><span><Wifi size={14}/>{connectionLabel}</span><span>{new Date(now).toLocaleTimeString(locale, {hour: '2-digit', minute: '2-digit'})} · {total} {es ? 'en la sala' : 'in the room'}</span></div>
            <div className="meeting-controls">
                <Control icon={media.isAudioMuted ? MicOff : Mic} compactLabel={es ? 'Micro' : 'Mic'} label={media.isAudioMuted ? (es ? 'Activar micro' : 'Unmute') : (es ? 'Silenciar' : 'Mute')} active={!media.isAudioMuted} onClick={media.toggleAudio} disabled={!media.localStream?.getAudioTracks().length}/>
                <Control icon={media.isVideoStopped ? VideoOff : Video} compactLabel={es ? 'Cámara' : 'Camera'} label={media.isVideoStopped ? (es ? 'Activar cámara' : 'Start camera') : (es ? 'Apagar cámara' : 'Stop camera')} active={!media.isVideoStopped} onClick={media.toggleVideo} disabled={!media.localStream?.getVideoTracks().length}/>
                <span className="meeting-control-divider"/>
                <Control icon={MonitorUp} compactLabel={es ? 'Pantalla' : 'Screen'} label={media.isScreenSharing ? (es ? 'Dejar de compartir' : 'Stop sharing') : (es ? 'Compartir' : 'Present')} active={media.isScreenSharing} onClick={() => void toggleScreen()} disabled={!navigator.mediaDevices?.getDisplayMedia}/>
                <Control icon={Hand} compactLabel={es ? 'Mano' : 'Hand'} label={hand ? (es ? 'Bajar mano' : 'Lower hand') : (es ? 'Levantar mano' : 'Raise hand')} active={hand} onClick={() => setHand(current => !current)}/>
                <div className="meeting-reaction-control" ref={pickerRef}><Control icon={SmilePlus} compactLabel={es ? 'Reacción' : 'React'} label={es ? 'Reacciones' : 'Reactions'} active={reactionsOpen} onClick={() => setReactionsOpen(current => !current)}/>
                    {reactionsOpen && <div className="meeting-reaction-picker" role="group" aria-label={es ? 'Reacciones' : 'Reactions'}>{EMOJI_LIST.map(({emoji, label}) => <button key={emoji} aria-label={label} onClick={() => {call.emitReaction(emoji); setReactionsOpen(false)}}><img src={getEmojiUrl(emoji)} alt="" draggable={false}/></button>)}</div>}
                </div>
                <Control icon={Palette} label={es ? 'Imagen' : 'Image'} active={panel === 'effects'} onClick={() => openPanel('effects')}/>
                <span className="meeting-control-divider"/>
                <Control icon={PhoneOff} label={es ? 'Salir' : 'Leave'} danger onClick={leave}/>
            </div>
            <div className="meeting-secondary-controls"><Control icon={Users} label={es ? 'Participantes' : 'People'} active={panel === 'people'} badge={requests.length} onClick={() => openPanel('people')}/><Control icon={MessageSquare} label="Chat" active={panel === 'chat'} badge={unread} onClick={() => openPanel('chat')}/></div>
        </footer>
        {notice && <div className="meeting-notice" role="status"><Check size={16}/><span>{notice}</span><button onClick={() => setNotice('')} aria-label={es ? 'Cerrar aviso' : 'Dismiss notification'}><X size={15}/></button></div>}
        <div className="meeting-floating-reactions" aria-live="off">{call.remoteReactions.map(reaction => <img key={reaction.id} className="animate-reaction" src={getEmojiUrl(reaction.emoji)} alt={reaction.emoji} style={{left: `calc(50% + ${reaction.x}px)`, bottom: `${reaction.y}px`, width: reaction.size, height: reaction.size}}/>)}</div>
        {Object.entries(call.remoteStreams).map(([id, stream]) => <RemoteAudio key={id} stream={stream} onBlocked={onAudioBlocked}/>)}
    </div>
}
