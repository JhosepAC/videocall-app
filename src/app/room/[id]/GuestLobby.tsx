'use client'

import {useEffect, useRef, useState} from 'react'
import Link from 'next/link'
import {ArrowLeft, Camera, CameraOff, Check, Clock, Loader2, Mic, MicOff, Video} from 'lucide-react'
import {useI18n} from '@/components/i18n/i18n-provider'
import {useGuestRequest} from '@/hooks/useJoinRequests'

interface GuestLobbyProps {
    roomId: string
    localStream: MediaStream | null
    status: string
    errorMessage: string | null
    isVideoStopped: boolean
    isAudioMuted: boolean
    toggleVideo: () => boolean
    toggleAudio: () => boolean
    onApproved: (name: string, avatar: string | null) => void
    onRejected: () => void
}

export default function GuestLobby({roomId, localStream, isVideoStopped, isAudioMuted, toggleVideo, toggleAudio, onApproved, onRejected}: GuestLobbyProps) {
    const {t, locale} = useI18n()
    const es = locale === 'es'
    const [name, setName] = useState('')
    const [nameError, setNameError] = useState('')
    const [avatar, setAvatar] = useState<string | null>(null)
    const [sending, setSending] = useState(false)
    const videoRef = useRef<HTMLVideoElement>(null)
    const request = useGuestRequest(roomId, name)
    useEffect(() => {
        const video = videoRef.current
        if (!video) return
        video.srcObject = localStream
        return () => { video.srcObject = null }
    }, [localStream])
    useEffect(() => {
        if (request.status === 'approved') onApproved(name.trim(), avatar)
    }, [request.status, onApproved, name, avatar])
    const submit = async (event: React.FormEvent) => {
        event.preventDefault()
        if (sending) return
        if (name.trim().length < 2) { setNameError(t('room.guest_name_min')); return }
        setNameError('')
        setSending(true)
        try { await request.sendRequest() }
        finally { setSending(false) }
    }
    const reset = async () => { await request.cancelRequest(); onRejected() }

    return <div className="meeting-room meeting-lobby-shell" lang={locale}>
        <header className="meeting-header"><Link href="/" className="meeting-brand"><Video size={25}/><span>MeetMesh</span></Link><div className="meeting-heading"><h1>{es ? 'Antes de entrar' : 'Before you join'}</h1><p>{es ? 'Tu espacio está listo' : 'Your space is ready'}</p></div><Link href="/" className="meeting-lobby-back"><ArrowLeft size={15}/>{es ? 'Inicio' : 'Home'}</Link></header>
        <main className="meeting-lobby-content">
            <section className="meeting-preview-section" aria-label={es ? 'Vista previa de cámara' : 'Camera preview'}>
                <div className="meeting-lobby-preview meeting-tile">
                    <video ref={videoRef} autoPlay playsInline muted className={`meeting-mirror ${isVideoStopped ? 'meeting-video-hidden' : ''}`}/>
                    {isVideoStopped && <div className="meeting-avatar">{avatar ? <img src={avatar} alt=""/> : <span className="meeting-initials">{name.trim().slice(0, 1).toUpperCase() || 'M'}</span>}<span>{es ? 'Cámara apagada' : 'Camera is off'}</span></div>}
                    <span className="meeting-preview-name">{name.trim() || (es ? 'Tu vista previa' : 'Your preview')}</span>
                    <div className="meeting-preview-controls">
                        <button onClick={toggleAudio} aria-label={isAudioMuted ? t('room.unmute') : t('room.mute')} aria-pressed={!isAudioMuted} disabled={!localStream?.getAudioTracks().length}>{isAudioMuted ? <MicOff size={21}/> : <Mic size={21}/>}</button>
                        <button onClick={toggleVideo} aria-label={isVideoStopped ? t('room.turn_on_camera') : t('room.turn_off_camera')} aria-pressed={!isVideoStopped} disabled={!localStream?.getVideoTracks().length}>{isVideoStopped ? <CameraOff size={21}/> : <Camera size={21}/>}</button>
                    </div>
                </div>
                <p>{es ? 'Comprueba tu imagen y tu audio antes de unirte.' : 'Check your camera and microphone before joining.'}</p>
            </section>
            <section className="meeting-lobby-form">
                {request.status === 'pending' || sending ? <div className="meeting-lobby-waiting" role="status"><Clock size={28}/><h2>{t('room.guest_pending_title')}</h2><p>{t('room.guest_pending_desc')}</p><strong>{name.trim()}</strong><button className="meeting-panel-action" onClick={() => void reset()}>{t('room.guest_cancel')}</button></div> :
                    request.status === 'rejected' ? <div className="meeting-lobby-waiting" role="alert"><ArrowLeft size={28}/><h2>{t('room.guest_rejected_title')}</h2><p>{t('room.guest_rejected_desc')}</p><button className="meeting-panel-action" onClick={() => void reset()}>{t('room.guest_try_again')}</button></div> : <>
                        <h2>{es ? 'Entra a la conversación.' : 'Join the conversation.'}</h2>
                        <p>{es ? 'El anfitrión te dará acceso a la reunión.' : 'The host will let you into the meeting.'}</p>
                        <form onSubmit={event => void submit(event)}>
                            <label htmlFor="guest-name">{t('room.guest_name_label')}</label><input id="guest-name" name="guest-name" autoComplete="name" placeholder={t('room.guest_name_placeholder')} value={name} maxLength={80} aria-invalid={Boolean(nameError)} aria-describedby={nameError ? 'guest-name-error' : undefined} onChange={event => {setName(event.target.value); setNameError('')}}/>
                            {nameError && <p className="meeting-error" id="guest-name-error" role="alert">{nameError}</p>}
                            <fieldset className="meeting-avatar-options"><legend>{t('room.guest_avatar_label')}</legend><div>{[1, 2].map(index => {
                                const src = `/images/guest/avatar_${index}.jpg`
                                return <button type="button" key={src} aria-label={`Avatar ${index}`} aria-pressed={avatar === src} onClick={() => setAvatar(current => current === src ? null : src)}><img src={src} alt=""/>{avatar === src && <Check size={15}/>}</button>
                            })}</div></fieldset>
                            {request.error && <p className="meeting-error" role="alert">{request.error}</p>}
                            <button className="meeting-lobby-submit" disabled={!name.trim() || sending}>{sending && <Loader2 className="meeting-spinner" size={17}/>} {t('room.guest_request_join')}</button>
                        </form>
                        <div className="meeting-lobby-account"><span>{es ? '¿Ya tienes una cuenta?' : 'Already have an account?'}</span><Link href="/login">{t('room.guest_sign_in')}</Link><span>·</span><Link href="/register">{t('room.guest_create_account')}</Link></div>
                    </>}
            </section>
        </main>
        <div className="meeting-lobby-caption">{es ? 'Reunión' : 'Meeting'} <span>{roomId}</span></div>
    </div>
}
