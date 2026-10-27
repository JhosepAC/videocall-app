'use client'

import {useState} from 'react'
import {Maximize2, Mic, MicOff, Monitor, Video, VideoOff} from 'lucide-react'
import {useI18n} from '@/components/i18n/i18n-provider'

/** A local interaction demo: no media devices or real room connection. */
export function CallPreview() {
    const {t} = useI18n()
    const [mic, setMic] = useState(true)
    const [camera, setCamera] = useState(true)
    const [sharing, setSharing] = useState(false)

    return <figure className="call-preview">
        <figcaption className="preview-caption"><span>{t('auth.experience.preview')}</span><span className="preview-caption-icon"><Video size={15} aria-hidden="true"/>MeetMesh</span></figcaption>
        <div className="preview-stage" data-sharing={sharing}>
            <div className="preview-participant preview-remote">
                {sharing ? <div className="preview-shared"><Monitor size={32} strokeWidth={1.3}/><span>{t('auth.experience.shared_screen')}</span></div> : <span className="preview-avatar">A</span>}
                <span className="preview-name">Alex</span>
                <span className="preview-signal" aria-hidden="true"><i/><i/><i/><i/></span>
            </div>
            <div className="preview-participant preview-self" data-camera={camera}>
                <span className="preview-avatar">{camera ? 'M' : <VideoOff size={26} strokeWidth={1.5}/>}</span>
                <span className="preview-name">{t('auth.experience.you')}</span>
                {!mic && <MicOff className="preview-muted" size={14} aria-hidden="true"/>}
            </div>
            <span className="preview-corner" aria-hidden="true"><Maximize2 size={15}/></span>
        </div>
        <div className="preview-toolbar">
            <span className="preview-status" role="status">{t(sharing ? 'auth.experience.sharing' : 'auth.experience.demo')}</span>
            <div className="preview-controls">
                <button type="button" aria-label={t('auth.experience.toggle_mic')} aria-pressed={mic} onClick={() => setMic(!mic)}>{mic ? <Mic size={17}/> : <MicOff size={17}/>}</button>
                <button type="button" aria-label={t('auth.experience.toggle_camera')} aria-pressed={camera} onClick={() => setCamera(!camera)}>{camera ? <Video size={17}/> : <VideoOff size={17}/>}</button>
                <button type="button" aria-label={t('auth.experience.toggle_screen')} aria-pressed={sharing} onClick={() => setSharing(!sharing)}><Monitor size={17}/></button>
            </div>
        </div>
    </figure>
}
