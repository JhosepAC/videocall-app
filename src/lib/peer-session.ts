/** One connection per endpoint, with permanent audio/camera/presentation slots.
 * Track replacement never depends on stream arrival order or camera availability.
 */
export class PeerSession {
    readonly connection: RTCPeerConnection
    readonly camera = new MediaStream()
    readonly screen = new MediaStream()
    private slots: RTCRtpTransceiver[] = []
    private readonly localStreams = [new MediaStream(), new MediaStream(), new MediaStream()]
    private tracks: [MediaStreamTrack | null, MediaStreamTrack | null, MediaStreamTrack | null] = [null, null, null]
    private makingOffer = false
    private ignoreOffer = false
    private settingAnswer = false
    private candidates: RTCIceCandidateInit[] = []
    private signals = Promise.resolve()
    private replacements = Promise.resolve()
    private recoveryTimer?: ReturnType<typeof setTimeout>
    private retries = 0
    private closed = false

    constructor(config: RTCConfiguration, private readonly polite: boolean, private readonly callbacks: {
        signal: (description: RTCSessionDescriptionInit) => void
        candidate: (candidate: RTCIceCandidateInit) => void
        streams: (camera: MediaStream, screen: MediaStream) => void
        state: (state: RTCPeerConnectionState) => void
        error: (error: unknown) => void
    }) {
        const pc = this.connection = new RTCPeerConnection(config)
        // The answerer adopts the offer's transceivers after setRemoteDescription.
        // Pre-creating them on both sides can produce six m-lines instead of three.
        if (!polite) this.slots = ['audio', 'video', 'video'].map((kind, index) => pc.addTransceiver(kind, {direction: 'recvonly', streams: [this.localStreams[index]]}))
        pc.onnegotiationneeded = async () => {
            // A single deterministic initial offer also avoids gathering ICE for
            // a local offer that would immediately be rolled back.
            if (this.polite && !pc.remoteDescription) return
            try {
                this.makingOffer = true
                await pc.setLocalDescription()
                if (!this.closed && pc.localDescription) callbacks.signal(pc.localDescription.toJSON())
            } catch (error) {
                if (!this.closed) callbacks.error(error)
            } finally {
                this.makingOffer = false
            }
        }
        pc.onicecandidate = ({candidate}) => {
            if (candidate) callbacks.candidate(candidate.toJSON())
        }
        pc.ontrack = ({track, transceiver}) => {
            const index = pc.getTransceivers().indexOf(transceiver)
            const stream = index === 2 ? this.screen : this.camera
            if (!stream.getTracks().some(item => item.id === track.id)) stream.addTrack(track)
            track.onunmute = () => callbacks.streams(this.camera, this.screen)
            callbacks.streams(this.camera, this.screen)
        }
        pc.onconnectionstatechange = () => {
            callbacks.state(pc.connectionState)
            clearTimeout(this.recoveryTimer)
            if (pc.connectionState === 'connected') { this.retries = 0; void this.setBudget() }
            if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                this.recoveryTimer = setTimeout(() => this.recover(), pc.connectionState === 'failed' ? 250 : 3000)
            }
        }
        pc.onsignalingstatechange = () => {
            if (pc.signalingState === 'stable' && pc.connectionState === 'connected') void this.setBudget()
        }
    }

    private async setBudget() {
        await Promise.all(this.slots.map(async (slot, index) => {
            const parameters = slot.sender.getParameters()
            if (!parameters.encodings?.length) return
            parameters.encodings[0].maxBitrate = index === 0 ? 64000 : index === 1 ? 1500000 : 2500000
            if (index > 0) parameters.encodings[0].maxFramerate = index === 1 ? 24 : 15
            try { await slot.sender.setParameters(parameters) }
            catch { /* Native congestion control remains in effect when unsupported. */ }
        }))
    }

    recover() {
        if (this.closed || this.connection.connectionState === 'connected') return
        if (this.retries++ >= 3) {
            this.callbacks.state('failed')
            return
        }
        this.connection.restartIce()
        this.recoveryTimer = setTimeout(() => this.recover(), 8000)
    }

    setTracks(audio: MediaStreamTrack | null, video: MediaStreamTrack | null, screen: MediaStreamTrack | null) {
        this.tracks = [audio, video, screen]
        // Serialize replacements so a slow filter/device switch cannot overwrite a newer track.
        this.replacements = this.replacements.then(async () => {
            if (this.closed) return
            await Promise.all(this.slots.map(async (slot, index) => {
                const track = this.tracks[index]
                if (slot.sender.track === track) return
                const live = track?.readyState === 'live' ? track : null
                await slot.sender.replaceTrack(live)
                const stream = this.localStreams[index]
                stream.getTracks().forEach(previous => stream.removeTrack(previous))
                if (live) stream.addTrack(live)
                slot.sender.setStreams(stream)
                // Null-to-live needs SDP direction/MSID negotiation so remote
                // browsers dispatch ontrack, including audio-only presenters.
                slot.direction = live ? 'sendrecv' : 'recvonly'
            }))
        }).catch(error => { if (!this.closed) this.callbacks.error(error) })
        return this.replacements
    }

    receive(description: RTCSessionDescriptionInit) {
        this.signals = this.signals.then(async () => {
            if (this.closed) return
            const pc = this.connection
            const ready = !this.makingOffer && (pc.signalingState === 'stable' || this.settingAnswer)
            const collision = description.type === 'offer' && !ready
            this.ignoreOffer = !this.polite && collision
            if (this.ignoreOffer) return
            this.settingAnswer = description.type === 'answer'
            try {
                // The polite peer implicitly rolls back its competing offer.
                await pc.setRemoteDescription(description)
                if (!this.slots.length) {
                    this.slots = pc.getTransceivers().slice(0, 3)
                    await this.setTracks(...this.tracks)
                }
                for (const candidate of this.candidates.splice(0)) {
                    try { await pc.addIceCandidate(candidate) }
                    catch { /* A rolled-back offer may have a different ICE generation. */ }
                }
                if (description.type === 'offer') {
                    await pc.setLocalDescription()
                    if (!this.closed && pc.localDescription) this.callbacks.signal(pc.localDescription.toJSON())
                }
            } finally {
                this.settingAnswer = false
            }
        }).catch(error => { if (!this.closed) this.callbacks.error(error) })
        return this.signals
    }

    async addCandidate(candidate: RTCIceCandidateInit) {
        if (this.closed) return
        if (!this.connection.remoteDescription || this.ignoreOffer) {
            if (this.candidates.length < 256) this.candidates.push(candidate)
            return
        }
        try {
            await this.connection.addIceCandidate(candidate)
        } catch (error) {
            if (!this.ignoreOffer && !this.closed) this.callbacks.error(error)
        }
    }

    close() {
        this.closed = true
        clearTimeout(this.recoveryTimer)
        this.connection.onconnectionstatechange = null
        this.connection.onsignalingstatechange = null
        this.connection.onnegotiationneeded = null
        this.connection.onicecandidate = null
        this.connection.ontrack = null
        this.connection.close()
        this.camera.getTracks().forEach(track => track.stop())
        this.screen.getTracks().forEach(track => track.stop())
    }
}
