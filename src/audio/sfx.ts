/**
 * The Sigil sound palette — v3 "Signal".
 *
 * Character: weightless · crystalline · vast · slightly alien. The field is not
 * a crypt; it is an open channel to somewhere far. Every pitch is a partial of
 * one 55 Hz string (A1) — 110·165·220·330·440·660 the ladder, plus the 7th
 * (385 Hz) and 11th (605 Hz) partials, which are exactly in tune with the series
 * and exist nowhere on a piano: **in tune with itself, out of tune with Earth.**
 * Summon *blooms up* the ladder; cast *collapses down* it into the only 55 Hz
 * fundamental in the score. Because every cue is drawn from one harmonic series,
 * overlapping cues fuse instead of clashing.
 *
 * Everything is synthesized with the Web Audio API — no asset files anywhere,
 * because nothing this build needs is fetched from a third party at runtime.
 * A factory over closures rather than a class, and it reads the
 * live sound config on every cue, so a user muting the field or swapping a take
 * takes effect on the next gesture with nothing to re-instantiate.
 *
 * Mechanics kept from the previous pass because they protect the listener rather
 * than a mood: repeat-ducking (the hundredth hearing is a whisper), short cues,
 * one master bus behind one soft safety limiter, filter-only drone breath.
 */
import type { SoundConfig } from '../schema/config.ts'

export type CueTakeName =
  | 'summonBloom'
  | 'summonTide'
  | 'read'
  | 'uncertain'
  | 'castCollapse'
  | 'castComet'

export type CueMeasurement = {
  peak: number
  peakDb: number
  rmsDb: number
  clips: boolean
}

type Bus = {
  context: BaseAudioContext
  output: GainNode
  reverbSend: ConvolverNode
}

type VoiceOptions = {
  when?: number
  peak?: number
  attack?: number
  decay?: number
  modulatorRatio?: number
  modulationIndex?: number
  glideTo?: number
  pan?: number
  scale?: number
}

export type Sfx = {
  /** The field opens. */
  summon: () => void
  /** Signal locked — a confident reading. */
  read: () => void
  /** The command executes. */
  cast: () => void
  /** Interference — a low-confidence reading. */
  uncertain: () => void
  traceStart: () => void
  /** `strokeSpeed` is pixels since the previous point. */
  traceMove: (strokeSpeed: number) => void
  traceEnd: () => void
  ambientStart: () => void
  ambientStop: () => void
  /**
   * Re-apply the current sound config to whatever is already sounding. Cues read
   * config when they fire, but the sustained bed does not — muting the field has
   * to silence it now, not on the next gesture.
   */
  refresh: () => void
  /** A/B any take without re-scoring: `preview('castComet')`. */
  preview: (takeName: CueTakeName) => void
  /** Render every take offline through the real bus and report peak/RMS. */
  measure: () => Promise<Record<string, CueMeasurement | null>>
  dispose: () => void
}

/** Partials 8–16 of the string — the high, alien dust the ink sheds. */
const STARDUST_PARTIALS = [440, 495, 550, 605, 660, 715, 770, 880]

const LIMITER = { threshold: -1.0, knee: 6, ratio: 12, attack: 0.003, release: 0.25 }

export type SfxOptions = {
  /** Read fresh on every cue — config changes need no re-instantiation. */
  getConfig: () => SoundConfig
}

export function createSfx({ getConfig }: SfxOptions): Sfx {
  let audioContext: AudioContext | null = null
  let liveBus: Bus | null = null
  let stardustNextGrainAt = 0
  let ambientDrone: ReturnType<typeof buildDrone> | null = null
  let wantAmbient = false
  const cueLastFiredAt: Record<string, number> = {}

  /** A dark, band-limited tail. White noise here hisses; a one-pole lowpass does not. */
  function buildImpulse(context: BaseAudioContext, seconds: number, decayPower: number, tone: number) {
    const sampleRate = context.sampleRate
    const length = Math.max(1, Math.floor(sampleRate * seconds))
    const impulseBuffer = context.createBuffer(2, length, sampleRate)
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulseBuffer.getChannelData(channel)
      let smoothed = 0
      for (let index = 0; index < length; index++) {
        smoothed += tone * (Math.random() * 2 - 1 - smoothed)
        channelData[index] = smoothed * 2.4 * Math.pow(1 - index / length, decayPower)
      }
    }
    return impulseBuffer
  }

  /** source → master gain → limiter → destination, with a reverb send folded back. */
  function makeBus(context: BaseAudioContext): Bus {
    const config = getConfig()
    const busGain = context.createGain()
    busGain.gain.value = config.masterGain
    const busLimiter = context.createDynamicsCompressor()
    busLimiter.threshold.value = LIMITER.threshold
    busLimiter.knee.value = LIMITER.knee
    busLimiter.ratio.value = LIMITER.ratio
    busLimiter.attack.value = LIMITER.attack
    busLimiter.release.value = LIMITER.release
    busGain.connect(busLimiter)
    busLimiter.connect(context.destination)
    const busReverb = context.createConvolver()
    busReverb.buffer = buildImpulse(context, config.reverbSeconds, config.reverbDecay, config.reverbTone)
    busReverb.connect(busGain)
    return { context, output: busGain, reverbSend: busReverb }
  }

  function ensureContext(): AudioContext | null {
    if (audioContext === null) {
      const AudioContextConstructor = globalThis.AudioContext
      if (AudioContextConstructor === undefined) return null
      try {
        audioContext = new AudioContextConstructor()
        liveBus = makeBus(audioContext)
      } catch {
        audioContext = null
        liveBus = null
        return null
      }
    }
    if (audioContext.state === 'suspended') void audioContext.resume()
    return audioContext
  }

  /** The live bus, or `null` when audio is unavailable or the user muted it. */
  function live(): Bus | null {
    if (!getConfig().enabled) return null
    if (ensureContext() === null) return null
    if (liveBus !== null) liveBus.output.gain.value = getConfig().masterGain
    return liveBus
  }

  /** A cue re-fired within the ducking window plays quieter. */
  function repeatScale(cueName: string): number {
    const nowSeconds = performance.now() / 1000
    const previous = cueLastFiredAt[cueName]
    const sinceLast = previous === undefined ? Infinity : nowSeconds - previous
    cueLastFiredAt[cueName] = nowSeconds
    for (const [withinSeconds, gainScale] of getConfig().repeatDuck) {
      if (sinceLast < withinSeconds) return gainScale
    }
    return 1
  }

  /**
   * One voice: a sine that can carry FM glass. With a modulator set, an
   * inharmonic partial strikes the carrier and its depth decays toward zero — the
   * bell "rings down" to a pure partial of the string.
   */
  function glassVoice(frequency: number, options: VoiceOptions, bus: Bus) {
    const { context, output, reverbSend } = bus
    const {
      when = 0,
      peak = 0.1,
      attack = 0.01,
      decay = 0.4,
      modulatorRatio = 0,
      modulationIndex = 0,
      glideTo = 0,
      pan = 0,
      scale = 1,
    } = options
    const startTime = context.currentTime + when
    const stopTime = startTime + attack + decay + 0.08

    const carrierOscillator = context.createOscillator()
    carrierOscillator.type = 'sine'
    carrierOscillator.frequency.setValueAtTime(frequency, startTime)
    if (glideTo > 0) {
      carrierOscillator.frequency.exponentialRampToValueAtTime(glideTo, startTime + attack + decay)
    }

    if (modulatorRatio > 0 && modulationIndex > 0) {
      const modulatorOscillator = context.createOscillator()
      modulatorOscillator.type = 'sine'
      modulatorOscillator.frequency.setValueAtTime(frequency * modulatorRatio, startTime)
      const modulationDepthGain = context.createGain()
      modulationDepthGain.gain.setValueAtTime(frequency * modulationIndex, startTime)
      modulationDepthGain.gain.exponentialRampToValueAtTime(
        Math.max(1, frequency * modulationIndex * 0.02),
        startTime + attack + decay,
      )
      modulatorOscillator.connect(modulationDepthGain)
      modulationDepthGain.connect(carrierOscillator.frequency)
      modulatorOscillator.start(startTime)
      modulatorOscillator.stop(stopTime)
    }

    const envelopeGain = context.createGain()
    envelopeGain.gain.setValueAtTime(0.0001, startTime)
    envelopeGain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * scale), startTime + attack)
    envelopeGain.gain.exponentialRampToValueAtTime(0.0001, startTime + attack + decay)
    carrierOscillator.connect(envelopeGain)

    let chainTail: AudioNode = envelopeGain
    if (pan !== 0) {
      const stereoPanner = context.createStereoPanner()
      stereoPanner.pan.value = pan
      envelopeGain.connect(stereoPanner)
      chainTail = stereoPanner
    }
    chainTail.connect(output)
    chainTail.connect(reverbSend)
    carrierOscillator.start(startTime)
    carrierOscillator.stop(stopTime)
  }

  /** Band-passed noise gliding between two centres — ionized air, not wind. */
  function airSweep(
    duration: number,
    peak: number,
    fromHz: number,
    toHz: number,
    bus: Bus,
    when = 0,
    scale = 1,
  ) {
    const { context, output, reverbSend } = bus
    const startTime = context.currentTime + when
    const length = Math.max(1, Math.floor(context.sampleRate * duration))
    const noiseBuffer = context.createBuffer(1, length, context.sampleRate)
    const noiseData = noiseBuffer.getChannelData(0)
    for (let index = 0; index < length; index++) noiseData[index] = Math.random() * 2 - 1
    const noiseSource = context.createBufferSource()
    noiseSource.buffer = noiseBuffer
    const sweepFilter = context.createBiquadFilter()
    sweepFilter.type = 'bandpass'
    sweepFilter.Q.value = 0.8
    sweepFilter.frequency.setValueAtTime(fromHz, startTime)
    sweepFilter.frequency.exponentialRampToValueAtTime(toHz, startTime + duration)
    const envelopeGain = context.createGain()
    envelopeGain.gain.setValueAtTime(0.0001, startTime)
    envelopeGain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * scale), startTime + 0.03)
    envelopeGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)
    noiseSource.connect(sweepFilter)
    sweepFilter.connect(envelopeGain)
    envelopeGain.connect(output)
    envelopeGain.connect(reverbSend)
    noiseSource.start(startTime)
    noiseSource.stop(startTime + duration + 0.05)
  }

  /**
   * The sustained carrier: partials 1·2·3 under a slow-breathing lowpass, plus
   * partial 6 parked *above* the cutoff so it glints only when the breath opens.
   * Breath is filter-only — gain tremolo is the "pulsing" ears latch onto.
   */
  function buildDrone(bus: Bus, gainTarget: number, when = 0) {
    const { context, output } = bus
    const startTime = context.currentTime + when
    const breathFilter = context.createBiquadFilter()
    breathFilter.type = 'lowpass'
    breathFilter.frequency.value = 250
    breathFilter.Q.value = 0.7
    const droneGain = context.createGain()
    droneGain.gain.setValueAtTime(0.0001, startTime)
    droneGain.gain.linearRampToValueAtTime(gainTarget, startTime + 3.0)
    const droneVoices: [number, OscillatorType, number][] = [
      [55, 'sine', 0],
      [110, 'sine', 0],
      [165, 'triangle', 3],
      [330, 'sine', -4],
    ]
    const droneOscillators = droneVoices.map(([voiceFrequency, waveType, detuneCents]) => {
      const oscillator = context.createOscillator()
      oscillator.type = waveType
      oscillator.frequency.value = voiceFrequency
      if (detuneCents !== 0) oscillator.detune.value = detuneCents
      oscillator.connect(breathFilter)
      oscillator.start(startTime)
      return oscillator
    })
    breathFilter.connect(droneGain)
    droneGain.connect(output)
    const breathLfo = context.createOscillator()
    breathLfo.frequency.value = 0.05 // ~20 s breath
    const breathDepth = context.createGain()
    breathDepth.gain.value = 70 // cutoff swings 180–320 Hz, across the glint's threshold
    breathLfo.connect(breathDepth)
    breathDepth.connect(breathFilter.frequency)
    breathLfo.start(startTime)
    return { droneOscillators, droneGain, breathLfo }
  }

  function ambientUp() {
    const config = getConfig()
    if (!config.droneEnabled) return
    const bus = live()
    if (bus === null || ambientDrone !== null) return
    ambientDrone = buildDrone(bus, config.droneGain)
  }

  function ambientDown() {
    if (ambientDrone === null || audioContext === null) return
    const now = audioContext.currentTime
    const { droneOscillators, droneGain, breathLfo } = ambientDrone
    droneGain.gain.cancelScheduledValues(now)
    droneGain.gain.setValueAtTime(droneGain.gain.value, now)
    droneGain.gain.linearRampToValueAtTime(0.0001, now + 0.6)
    for (const oscillator of droneOscillators) oscillator.stop(now + 0.75)
    breathLfo.stop(now + 0.75)
    ambientDrone = null
  }

  // ── the score ────────────────────────────────────────────────────────────
  // The channel opens: partials light up the ladder low-to-high over a faint
  // ionized rise, the top rung glassed with FM. ~0.55 s, quiet.
  function cueSummonBloom(bus: Bus, beginAt = 0, scale = 1) {
    airSweep(0.42, 0.012, 300, 1300, bus, beginAt, scale)
    glassVoice(110, { peak: 0.05, attack: 0.012, decay: 0.34, when: beginAt, scale }, bus)
    glassVoice(165, { peak: 0.042, attack: 0.012, decay: 0.38, when: beginAt + 0.05, scale }, bus)
    glassVoice(220, { peak: 0.036, attack: 0.012, decay: 0.42, when: beginAt + 0.1, pan: -0.15, scale }, bus)
    glassVoice(330, { peak: 0.026, attack: 0.014, decay: 0.48, when: beginAt + 0.16, pan: 0.15, scale }, bus)
    glassVoice(
      440,
      { peak: 0.014, attack: 0.016, decay: 0.58, modulatorRatio: 2.76, modulationIndex: 1.1, when: beginAt + 0.23, scale },
      bus,
    )
  }

  // Alternate summon: ONE voice whose timbre opens — an inharmonic modulator
  // blooms from silence to full depth and settles, like an iris dilating.
  function cueSummonTide(bus: Bus, beginAt = 0, scale = 1) {
    const { context, output, reverbSend } = bus
    const startTime = context.currentTime + beginAt
    const carrierOscillator = context.createOscillator()
    carrierOscillator.type = 'sine'
    carrierOscillator.frequency.value = 165
    const modulatorOscillator = context.createOscillator()
    modulatorOscillator.type = 'sine'
    modulatorOscillator.frequency.value = 165 * 2.41
    const modulationDepthGain = context.createGain()
    modulationDepthGain.gain.setValueAtTime(4, startTime)
    modulationDepthGain.gain.exponentialRampToValueAtTime(165 * 2.0, startTime + 0.4)
    modulationDepthGain.gain.exponentialRampToValueAtTime(6, startTime + 0.85)
    modulatorOscillator.connect(modulationDepthGain)
    modulationDepthGain.connect(carrierOscillator.frequency)
    const envelopeGain = context.createGain()
    envelopeGain.gain.setValueAtTime(0.0001, startTime)
    envelopeGain.gain.exponentialRampToValueAtTime(Math.max(0.0002, 0.055 * scale), startTime + 0.06)
    envelopeGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.9)
    carrierOscillator.connect(envelopeGain)
    envelopeGain.connect(output)
    envelopeGain.connect(reverbSend)
    carrierOscillator.start(startTime)
    modulatorOscillator.start(startTime)
    carrierOscillator.stop(startTime + 1.0)
    modulatorOscillator.stop(startTime + 1.0)
  }

  // Signal locked: one crystalline FM ping high on the ladder over a faint root
  // shadow. Instant attack — certainty sounds like a point, not a swell.
  function cueRead(bus: Bus, beginAt = 0, scale = 1) {
    glassVoice(
      660,
      { peak: 0.042, attack: 0.006, decay: 0.3, modulatorRatio: 2.76, modulationIndex: 1.6, when: beginAt, scale },
      bus,
    )
    glassVoice(110, { peak: 0.018, attack: 0.01, decay: 0.22, when: beginAt + 0.01, scale }, bus)
  }

  // Interference: the alien 7th partial against itself a quarter-tone sharp,
  // beating at ~11 Hz, swelling in slowly. An unresolved signal — never an alarm.
  function cueUncertain(bus: Bus, beginAt = 0, scale = 1) {
    glassVoice(385, { peak: 0.03, attack: 0.06, decay: 0.34, when: beginAt, pan: -0.12, scale }, bus)
    glassVoice(396.2, { peak: 0.03, attack: 0.06, decay: 0.34, when: beginAt, pan: 0.12, scale }, bus)
    glassVoice(110, { peak: 0.016, attack: 0.03, decay: 0.3, when: beginAt + 0.04, scale }, bus)
  }

  // The payoff — summon inverted. The lit ladder funnels down rung by rung into
  // an FM strike on 110 and the only 55 Hz fundamental in the palette.
  function cueCastCollapse(bus: Bus, beginAt = 0, scale = 1) {
    airSweep(0.38, 0.02, 1100, 130, bus, beginAt, scale)
    glassVoice(440, { peak: 0.028, attack: 0.008, decay: 0.22, when: beginAt, pan: 0.18, scale }, bus)
    glassVoice(330, { peak: 0.034, attack: 0.008, decay: 0.26, when: beginAt + 0.04, pan: -0.14, scale }, bus)
    glassVoice(220, { peak: 0.042, attack: 0.008, decay: 0.32, when: beginAt + 0.08, pan: 0.1, scale }, bus)
    glassVoice(165, { peak: 0.05, attack: 0.008, decay: 0.4, when: beginAt + 0.12, scale }, bus)
    glassVoice(
      110,
      { peak: 0.075, attack: 0.008, decay: 0.85, modulatorRatio: 2.76, modulationIndex: 2.4, when: beginAt + 0.16, scale },
      bus,
    )
    glassVoice(55, { peak: 0.15, attack: 0.006, decay: 0.75, when: beginAt + 0.16, scale }, bus)
  }

  // Alternate cast: the message *leaves* — a sub thump grounds the execution,
  // then a strike and three stardust steps evaporate upward.
  function cueCastComet(bus: Bus, beginAt = 0, scale = 1) {
    glassVoice(55, { peak: 0.15, attack: 0.005, decay: 0.6, when: beginAt, scale }, bus)
    glassVoice(
      110,
      { peak: 0.07, attack: 0.008, decay: 0.8, modulatorRatio: 2.76, modulationIndex: 3.0, when: beginAt + 0.01, scale },
      bus,
    )
    airSweep(0.55, 0.016, 350, 2600, bus, beginAt + 0.1, scale)
    glassVoice(440, { peak: 0.016, attack: 0.008, decay: 0.3, when: beginAt + 0.16, pan: -0.2, scale }, bus)
    glassVoice(660, { peak: 0.013, attack: 0.008, decay: 0.34, when: beginAt + 0.26, pan: 0.2, scale }, bus)
    glassVoice(880, { peak: 0.01, attack: 0.008, decay: 0.4, when: beginAt + 0.36, pan: -0.1, scale }, bus)
  }

  const CUE_TAKES: Record<CueTakeName, (bus: Bus, beginAt?: number, scale?: number) => void> = {
    summonBloom: cueSummonBloom,
    summonTide: cueSummonTide,
    read: cueRead,
    uncertain: cueUncertain,
    castCollapse: cueCastCollapse,
    castComet: cueCastComet,
  }

  /** The ink sheds pitched grains — faster stroke, denser dust; stalled sheds none. */
  function shedStardustGrain(strokeSpeed: number) {
    const bus = live()
    if (bus === null || audioContext === null) return
    const now = audioContext.currentTime
    if (now < stardustNextGrainAt) return
    const speedAmount = Math.min(1, strokeSpeed / 26)
    if (speedAmount <= 0.02) return
    const grainFrequency = STARDUST_PARTIALS[Math.floor(Math.random() * STARDUST_PARTIALS.length)]!
    glassVoice(
      grainFrequency,
      {
        peak: 0.006 + 0.02 * speedAmount,
        attack: 0.004,
        decay: 0.07 + 0.05 * Math.random(),
        modulatorRatio: 2.76,
        modulationIndex: 0.8,
        pan: (Math.random() * 2 - 1) * 0.4,
      },
      bus,
    )
    stardustNextGrainAt = now + 0.09 - 0.045 * speedAmount // min ~45 ms apart
  }

  function analyze(renderedBuffer: AudioBuffer): CueMeasurement {
    let peakAmplitude = 0
    let sumOfSquares = 0
    let sampleCount = 0
    for (let channel = 0; channel < renderedBuffer.numberOfChannels; channel++) {
      const channelData = renderedBuffer.getChannelData(channel)
      for (let index = 0; index < channelData.length; index++) {
        const sample = channelData[index]!
        const magnitude = Math.abs(sample)
        if (magnitude > peakAmplitude) peakAmplitude = magnitude
        sumOfSquares += sample * sample
        sampleCount++
      }
    }
    const rootMeanSquare = Math.sqrt(sumOfSquares / Math.max(1, sampleCount))
    const toDb = (amplitude: number) =>
      amplitude > 0 ? Number((20 * Math.log10(amplitude)).toFixed(1)) : -120
    return {
      peak: Number(peakAmplitude.toFixed(4)),
      peakDb: toDb(peakAmplitude),
      rmsDb: toDb(rootMeanSquare),
      clips: peakAmplitude >= 1.0,
    }
  }

  function renderOffline(seconds: number, trigger: (bus: Bus) => void): Promise<CueMeasurement | null> {
    const OfflineContextConstructor = globalThis.OfflineAudioContext
    if (OfflineContextConstructor === undefined) return Promise.resolve(null)
    const offlineContext = new OfflineContextConstructor(2, Math.ceil(44100 * seconds), 44100)
    trigger(makeBus(offlineContext))
    return offlineContext.startRendering().then(analyze)
  }

  return {
    summon() {
      const bus = live()
      if (bus === null) return
      const take = getConfig().summonTake === 'tide' ? cueSummonTide : cueSummonBloom
      take(bus, 0, repeatScale('summon'))
    },
    read() {
      const bus = live()
      if (bus !== null) cueRead(bus, 0, repeatScale('read'))
    },
    cast() {
      const bus = live()
      if (bus === null) return
      const take = getConfig().castTake === 'comet' ? cueCastComet : cueCastCollapse
      take(bus, 0, repeatScale('cast'))
    },
    uncertain() {
      const bus = live()
      if (bus !== null) cueUncertain(bus, 0, repeatScale('uncertain'))
    },
    traceStart() {
      if (live() !== null) stardustNextGrainAt = 0
    },
    traceMove(strokeSpeed) {
      shedStardustGrain(strokeSpeed)
    },
    traceEnd() {
      // Grains are ≤130 ms one-shots — nothing sustained to tear down.
    },
    ambientStart() {
      wantAmbient = true
      ambientUp()
    },
    ambientStop() {
      wantAmbient = false
      ambientDown()
    },
    refresh() {
      const config = getConfig()
      if (!config.enabled || !config.droneEnabled) {
        ambientDown()
        return
      }
      if (wantAmbient) ambientUp()
    },
    preview(takeName) {
      const bus = live()
      if (bus !== null) CUE_TAKES[takeName](bus)
    },
    measure() {
      const config = getConfig()
      const jobs: Promise<readonly [string, CueMeasurement | null]>[] = (
        Object.keys(CUE_TAKES) as CueTakeName[]
      ).map((takeName) =>
        renderOffline(2.6, (bus) => CUE_TAKES[takeName](bus)).then(
          (result) => [takeName, result] as const,
        ),
      )
      if (config.droneEnabled) {
        jobs.push(
          renderOffline(7.0, (bus) => buildDrone(bus, config.droneGain)).then(
            (result) => ['drone(bed)', result] as const,
          ),
        )
      }
      return Promise.all(jobs).then(Object.fromEntries)
    },
    dispose() {
      ambientDown()
      wantAmbient = false
      if (audioContext !== null) void audioContext.close()
      audioContext = null
      liveBus = null
    },
  }
}
