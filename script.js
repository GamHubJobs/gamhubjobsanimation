/* ============ SHARED AUDIO CONTEXT ============ */
        /* One AudioContext for everything (music + effects) so they always
           stay in sync and we never spin up duplicate contexts. */
        let sharedAudioCtx = null;

        function getSharedAudioContext() {
            if (!sharedAudioCtx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (!AudioCtx) return null;
                sharedAudioCtx = new AudioCtx();
            }
            if (sharedAudioCtx.state === 'suspended') {
                sharedAudioCtx.resume().catch(() => {});
            }
            return sharedAudioCtx;
        }

        // Browsers block audio until a user gesture; unlock as soon as one
        // happens so both music and effects work once the viewer interacts.
        ['pointerdown', 'touchstart', 'keydown'].forEach(evt => {
            document.addEventListener(evt, getSharedAudioContext, { once: true, passive: true });
        });

        /* ============ MUSIC MANAGER ============ */
        /* Subtle, looping background pad for the CV Tips experience. No
           audio asset exists in the project, so this is synthesized — but
           it's isolated behind start()/stop()/duck() so it can be swapped
           for a real music file later (e.g. an <audio>/buffer source
           feeding the same masterGain) without touching quiz logic or any
           of the call sites below. Lowest priority in the audio mix: it
           never affects effect volumes, only the reverse (see duck()). */
        const MusicManager = (function () {
            const BASE_VOLUME = 0.05;   // very low, sits under everything else
            const DUCK_VOLUME = 0.016;  // briefly dipped while an effect plays

            let masterGain = null;
            let lfo = null;
            let voices = [];
            let playing = false;
            let duckResetTimeout = null;

            // A gentle I-IV-V-I progression (Cmaj7 -> Fmaj7 -> G -> Cmaj7)
            // arpeggiated over the pedal-tone pad below, giving the loop an
            // actual sense of forward motion/resolution ("career growth")
            // rather than sitting on one static chord. Scheduled with
            // lookahead (rather than setInterval) so it never drifts.
            const ARP_PATTERN = [
                261.63, 329.63, 392.0, 493.88,   // Cmaj7  (C4 E4 G4 B4)
                349.23, 440.0, 523.25, 659.25,   // Fmaj7  (F4 A4 C5 E5)
                392.0, 493.88, 587.33, 783.99,   // G      (G4 B4 D5 G5)
                261.63, 329.63, 392.0, 523.25    // Cmaj7  (C4 E4 G4 C5, resolving)
            ];
            const ARP_NOTE_INTERVAL = 0.5;
            const ARP_NOTE_GAIN = 0.3;
            let arpStep = 0;
            let nextArpTime = 0;
            let arpSchedulerId = null;

            function buildPad(context, destination) {
                // A grounded, consonant pedal tone (C3-G3-C4 — root, fifth,
                // octave) instead of a full chord: it sits comfortably under
                // every chord in the arpeggio above without clashing, for a
                // calmer, more "focused" texture than the previous version.
                const notes = [
                    { freq: 130.81, type: 'sine', gain: 0.5 },      // C3
                    { freq: 196.0, type: 'triangle', gain: 0.3 },   // G3
                    { freq: 261.63, type: 'sine', gain: 0.22 }      // C4 (light shimmer)
                ];

                return notes.map((note) => {
                    const osc = context.createOscillator();
                    osc.type = note.type;
                    osc.frequency.setValueAtTime(note.freq, context.currentTime);

                    const voiceGain = context.createGain();
                    voiceGain.gain.setValueAtTime(note.gain, context.currentTime);

                    osc.connect(voiceGain);
                    voiceGain.connect(destination);
                    osc.start();

                    return osc;
                });
            }

            function playArpNote(context, freq, time) {
                if (!masterGain) return;
                const osc = context.createOscillator();
                const noteGain = context.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, time);

                noteGain.gain.setValueAtTime(0.0001, time);
                noteGain.gain.exponentialRampToValueAtTime(ARP_NOTE_GAIN, time + 0.025);
                noteGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.42);

                osc.connect(noteGain);
                noteGain.connect(masterGain);

                osc.start(time);
                osc.stop(time + 0.46);
            }

            function scheduleArp(context) {
                if (!playing) return;
                // Lookahead scheduling (queue notes ~200ms ahead) instead of
                // setInterval, so the tempo never drifts and nothing can
                // double-schedule the same beat.
                while (nextArpTime < context.currentTime + 0.2) {
                    playArpNote(context, ARP_PATTERN[arpStep % ARP_PATTERN.length], nextArpTime);
                    nextArpTime += ARP_NOTE_INTERVAL;
                    arpStep++;
                }
                arpSchedulerId = setTimeout(() => scheduleArp(context), 60);
            }

            function start() {
                if (playing) return; // never create a second instance
                const context = getSharedAudioContext();
                if (!context) return;

                masterGain = context.createGain();
                masterGain.gain.setValueAtTime(0.0001, context.currentTime);
                masterGain.gain.linearRampToValueAtTime(BASE_VOLUME, context.currentTime + 2);
                masterGain.connect(context.destination);

                // A slow, gentle breathing movement so the loop never feels
                // static or draws attention to itself.
                lfo = context.createOscillator();
                lfo.type = 'sine';
                lfo.frequency.setValueAtTime(0.07, context.currentTime);
                const lfoGain = context.createGain();
                lfoGain.gain.setValueAtTime(BASE_VOLUME * 0.2, context.currentTime);
                lfo.connect(lfoGain);
                lfoGain.connect(masterGain.gain);
                lfo.start();

                voices = buildPad(context, masterGain);
                playing = true;

                arpStep = 0;
                nextArpTime = context.currentTime + 0.6;
                scheduleArp(context);
            }

            function stop() {
                if (!playing) return;
                const context = getSharedAudioContext();
                if (context && masterGain) {
                    masterGain.gain.cancelScheduledValues(context.currentTime);
                    masterGain.gain.linearRampToValueAtTime(0.0001, context.currentTime + 0.6);
                }

                const voicesToStop = voices;
                const lfoToStop = lfo;
                setTimeout(() => {
                    voicesToStop.forEach(o => { try { o.stop(); } catch (e) {} });
                    if (lfoToStop) { try { lfoToStop.stop(); } catch (e) {} }
                }, 650);

                voices = [];
                lfo = null;
                masterGain = null;
                playing = false;
                clearTimeout(duckResetTimeout);
                clearTimeout(arpSchedulerId);
                arpSchedulerId = null;
            }

            // Briefly lower the music so a sound effect reads clearly, then
            // smoothly restore it. Safe to call repeatedly/overlappingly —
            // each call just re-schedules the same restore.
            function duck(holdMs) {
                if (!playing || !masterGain) return;
                const context = getSharedAudioContext();
                if (!context) return;

                clearTimeout(duckResetTimeout);
                masterGain.gain.cancelScheduledValues(context.currentTime);
                masterGain.gain.setTargetAtTime(DUCK_VOLUME, context.currentTime, 0.05);

                duckResetTimeout = setTimeout(() => {
                    if (!playing || !masterGain) return;
                    masterGain.gain.setTargetAtTime(BASE_VOLUME, context.currentTime, 0.3);
                }, holdMs || 350);
            }

            return { start, stop, duck };
        })();

        /* ============ AUDIO MANAGER ============ */
        /* Centralized, single-instance sound effects via the Web Audio API.
           No audio assets exist in this codebase yet, so effects are
           synthesized rather than adding new file dependencies. Every sound
           goes through this manager so a new instance always stops/replaces
           any previous instance of the same sound — nothing can stack or
           overlap, no matter how quickly stages change. Each effect also
           ducks the background music briefly so it always reads clearly
           over the music (effects outrank music in the mix; music never
           affects effects). */
        const AudioManager = (function () {
            const active = {};

            function getContext() {
                return getSharedAudioContext();
            }

            function stop(key) {
                const entry = active[key];
                if (entry) {
                    try { entry.stop(); } catch (e) { /* already stopped */ }
                    delete active[key];
                }
            }

            function playSwoosh(key, options) {
                const context = getContext();
                if (!context) return;
                stop(key);

                const opts = options || {};
                const duration = opts.duration || 0.32;
                const startFreq = opts.startFreq || 1400;
                const endFreq = opts.endFreq || 300;
                const volume = opts.volume || 0.22;

                const bufferSize = Math.floor(context.sampleRate * duration);
                const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
                }

                const noise = context.createBufferSource();
                noise.buffer = buffer;

                const filter = context.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(startFreq, context.currentTime);
                filter.frequency.exponentialRampToValueAtTime(endFreq, context.currentTime + duration);

                const gain = context.createGain();
                gain.gain.setValueAtTime(0.0001, context.currentTime);
                gain.gain.exponentialRampToValueAtTime(volume, context.currentTime + 0.04);
                gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);

                noise.connect(filter);
                filter.connect(gain);
                gain.connect(context.destination);

                noise.start();
                noise.stop(context.currentTime + duration);

                active[key] = { stop: () => { try { noise.stop(); } catch (e) {} } };
                noise.onended = () => { delete active[key]; };

                MusicManager.duck(duration * 1000 + 150);
            }

            function playPop(key) {
                const context = getContext();
                if (!context) return;
                stop(key);

                const osc = context.createOscillator();
                const gain = context.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(520, context.currentTime);
                osc.frequency.exponentialRampToValueAtTime(900, context.currentTime + 0.09);

                gain.gain.setValueAtTime(0.0001, context.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.28, context.currentTime + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.2);

                osc.connect(gain);
                gain.connect(context.destination);

                osc.start();
                osc.stop(context.currentTime + 0.22);

                active[key] = { stop: () => { try { osc.stop(); } catch (e) {} } };
                osc.onended = () => { delete active[key]; };

                MusicManager.duck(350);
            }

            function playTick(key) {
                const context = getContext();
                if (!context) return;
                stop(key);

                const osc = context.createOscillator();
                const gain = context.createGain();

                osc.type = 'square';
                osc.frequency.setValueAtTime(1000, context.currentTime);

                gain.gain.setValueAtTime(0.0001, context.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.1, context.currentTime + 0.005);
                gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.06);

                osc.connect(gain);
                gain.connect(context.destination);

                osc.start();
                osc.stop(context.currentTime + 0.07);

                active[key] = { stop: () => { try { osc.stop(); } catch (e) {} } };
                osc.onended = () => { delete active[key]; };

                MusicManager.duck(150);
            }

            function playDing(key) {
                const context = getContext();
                if (!context) return;
                stop(key);

                // Two-tone E6 -> G6 ding (matches the reference sound design).
                const now = context.currentTime;
                const tones = [
                    { freq: 1318.51, start: now, duration: 0.45, peak: 0.26, attack: 0.005 },        // E6
                    { freq: 1567.98, start: now + 0.09, duration: 0.45, peak: 0.2, attack: 0.005 }   // G6
                ];

                const stopHandles = [];
                let latestEnd = now;

                tones.forEach(({ freq, start, duration, peak, attack }) => {
                    const osc = context.createOscillator();
                    const gain = context.createGain();

                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, start);

                    gain.gain.setValueAtTime(0.0001, start);
                    gain.gain.exponentialRampToValueAtTime(peak, start + attack);
                    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

                    osc.connect(gain);
                    gain.connect(context.destination);

                    osc.start(start);
                    osc.stop(start + duration + 0.02);

                    stopHandles.push(() => { try { osc.stop(); } catch (e) {} });
                    latestEnd = Math.max(latestEnd, start + duration);
                });

                active[key] = { stop: () => { stopHandles.forEach(fn => fn()); } };
                const cleanupDelayMs = (latestEnd - now + 0.05) * 1000;
                setTimeout(() => { delete active[key]; }, cleanupDelayMs);

                MusicManager.duck((latestEnd - now) * 1000 + 150);
            }

            function stopAll() {
                Object.keys(active).forEach(stop);
            }

            return { playSwoosh, playPop, playTick, playDing, stop, stopAll };
        })();

        /* ============ SCREEN SWITCHING ============ */
        function showScreen(name) {
            document.getElementById('opening-screen').classList.toggle('active', name === 'opening');
            document.getElementById('content-screen').classList.toggle('active', name === 'content');
            document.getElementById('share-screen').classList.toggle('active', name === 'share');
            document.getElementById('cta-screen').classList.toggle('active', name === 'cta');

            // The counter + prev/next chrome sits on top of every slide
            // except the auto-playing opening hook.
            const chromeVisible = name !== 'opening';
            progressBadgeElement.style.display = chromeVisible ? '' : 'none';
            navPrevElement.style.display = chromeVisible ? '' : 'none';
            navNextElement.style.display = chromeVisible ? '' : 'none';
        }

        /* ============ SCREEN 1: OPENING HOOK ============ */
        function runOpening() {
            showScreen('opening');
            MusicManager.start(); // begins once, for the whole CV Tips experience
            const texts = document.querySelectorAll('#opening-screen .promo-text');
            const staggerMs = 2500;

            texts.forEach((text, index) => {
                setTimeout(() => {
                    text.classList.add('visible');
                    if (index === texts.length - 1) {
                        text.style.animation = 'fade-in-up 1.5s forwards';
                    }
                }, index * staggerMs);
            });

            const holdAfterReveal = 3000;
            const totalOpeningTime = (texts.length - 1) * staggerMs + holdAfterReveal + 1500;
            setTimeout(() => goToSlide(0, 'forward'), totalOpeningTime);
        }

        /* ============ SCREEN 3: ENGAGEMENT SCREEN ============ */
        function renderShare(token) {
            showScreen('share');
            const texts = document.querySelectorAll('#share-screen .promo-text');
            const staggerMs = 2000;

            texts.forEach(t => {
                t.classList.remove('visible');
                t.style.animation = '';
            });

            texts.forEach((text, index) => {
                setTimeout(() => {
                    if (token !== navToken) return;
                    text.classList.add('visible');
                    if (index === texts.length - 1) {
                        text.style.animation = 'fade-in-up 1.5s forwards';
                    }
                }, index * staggerMs);
            });

            const holdAfterReveal = 3000;
            const totalShareTime = (texts.length - 1) * staggerMs + holdAfterReveal + 1500;

            // Same auto-advance behavior as before: the share screen moves
            // on by itself once its message has had time to land. A manual
            // Prev/Next or swipe during this window cancels it (see
            // goToSlide), so it never fires against a slide the person has
            // already left.
            pendingSlideTimeout = setTimeout(() => {
                if (token !== navToken) return;
                goToSlide(currentSlidePos + 1, 'forward');
            }, totalShareTime);
        }

        /* ============ SCREEN 4: CLOSING CTA ============ */
        function renderCta(token) {
            showScreen('cta');
            const texts = document.querySelectorAll('#cta-screen .promo-text');
            const button = ctaButtonElement;
            const staggerMs = 2000;

            texts.forEach(t => {
                t.classList.remove('visible');
                t.style.animation = '';
            });
            button.classList.remove('visible');

            texts.forEach((text, index) => {
                setTimeout(() => {
                    if (token !== navToken) return;
                    text.classList.add('visible');
                }, index * staggerMs);
            });

            setTimeout(() => {
                if (token !== navToken) return;
                button.classList.add('visible');
            }, texts.length * staggerMs);

            // Intentionally no auto-advance: this is the closing call to
            // action, so it stays on screen until the person swipes/taps
            // Prev or Next themselves.
        }

        /* ============ SCREEN 2: CV TIPS DATA ============ */
        /* Flexible content model — a tip's `content` can carry text only,
           image only, or both. `image` accepts either a remote URL or a
           local file path; missing/broken images are handled gracefully.
           `type: "cv"` is kept on each entry so a future "interview" series
           can be added later without restructuring this array. */
        // Falls back to this only if `estimateHookReadTime` can't produce a
        // value (e.g. a tip with an empty/missing prompt).
        const DEFAULT_HOOK_READ_TIME = 3000;
        const DEFAULT_TEXT_READ_TIME = 4500;
        const DEFAULT_IMAGE_READ_TIME = 4500;
        const DEFAULT_WHY_READ_TIME = 8000;

        // Voiceover-aware pacing for the hook stage (where `tip.prompt` is
        // shown). Automatically sizes the hook's on-screen time to a
        // prompt's word count — no manual tuning needed when adding new
        // prompts in future. The formula:
        //   1) Estimated AI voiceover narration time, at a natural,
        //      unhurried pace (~150 wpm) — this is the binding constraint,
        //      since silent reading is faster than TTS narration.
        //   2) + a short pause for closing punctuation (e.g. "?").
        //   3) + a small breathing-room buffer after narration ends, so the
        //      transition never feels rushed or cuts the voiceover off.
        // Result is rounded to the nearest 100ms. To hand-tune a specific
        // prompt instead, just set `hookReadTime` directly on that tip —
        // it always takes priority over this estimate.
        const NARRATION_MS_PER_WORD = 400;  // ~150 wpm natural voiceover pace
        const TERMINAL_PAUSE_MS = 300;      // pause for closing punctuation
        const HOOK_BREATHING_ROOM_MS = 700; // buffer after narration ends
        const MIN_HOOK_READ_TIME = 2200;    // floor, even for a 1-2 word prompt
        const MAX_HOOK_READ_TIME = 9000;    // ceiling, to avoid a dead-feeling pause

        function estimateHookReadTime(promptText) {
            const wordCount = String(promptText || '')
                .trim()
                .split(/\s+/)
                .filter(Boolean).length;

            if (wordCount === 0) {
                return DEFAULT_HOOK_READ_TIME;
            }

            const estimated =
                wordCount * NARRATION_MS_PER_WORD +
                TERMINAL_PAUSE_MS +
                HOOK_BREATHING_ROOM_MS;

            const rounded = Math.round(estimated / 100) * 100;
            return Math.min(MAX_HOOK_READ_TIME, Math.max(MIN_HOOK_READ_TIME, rounded));
        }

        const tips = [
            {
                type: "cv",
                title: "CV TIP #1",
                prompt: "Which CV line actually gets you shortlisted?",
                mistake: {
                    text: "\u201cResponsible for handling customer queries.\u201d"
                },
                approach: {
                    text: "\u201cResolved 40+ customer queries daily, improving response time by 25%.\u201d"
                },
                whyItWorks: {
                    text: "Accomplishment-focused CV statements give employers clearer evidence of your real impact than a list of duties.",
                    source: "Harvard University, Office of Career Services",
                    readTime: 9000
                },
                readTime: 5100
            },
            {
                type: "cv",
                title: "CV TIP #2",
                prompt: "Which sentence sounds more hireable?",
                mistake: {
                    text: "\u201cWas involved in team projects.\u201d"
                },
                approach: {
                    text: "\u201cLed a 5-person team to launch the project 2 weeks early.\u201d"
                },
                whyItWorks: {
                    text: "Action verbs make achievements easier for recruiters to scan and remember during a fast CV review.",
                    source: "Indeed Career Guide",
                    readTime: 8000
                },
                readTime: 5400
            },
            {
                type: "cv",
                title: "CV TIP #3",
                prompt: "Which CV survives the first filter?",
                mistake: {
                    text: "A busy layout packed with heavy graphics, icons, and multiple columns."
                },
                approach: {
                    text: "A clean, single-column layout with standard section headings like \u201cExperience\u201d and \u201cEducation.\u201d"
                },
                whyItWorks: {
                    text: "Most large employers scan CVs with Applicant Tracking Systems before a human sees them \u2014 complex formatting can get qualified candidates filtered out.",
                    source: "Jobscan, ATS Resume Research",
                    readTime: 9000
                },
                readTime: 7300
            },
            {
                type: "cv",
                title: "CV TIP #4",
                prompt: "Which claim actually proves impact?",
                mistake: {
                    text: "\u201cImproved sales performance.\u201d"
                },
                approach: {
                    text: "\u201cIncreased monthly sales by 23% in 6 months.\u201d"
                },
                whyItWorks: {
                    text: "Quantified achievements are one of the strongest signals recruiters use to judge whether an impact claim is real.",
                    source: "TopCV Resume Research",
                    readTime: 8000
                },
                readTime: 4000
            }
        ];

        /* ============ CAROUSEL / SLIDE ORDER ============
           Each tip becomes one navigable slide. The engagement ("share")
           screen keeps its original place — right before the last tip —
           and the new closing CTA is appended as the final slide, after
           which the carousel loops back to tip #1. Built from `tips`
           dynamically so adding/removing tips never needs this list to be
           hand-edited. */
        function buildSlideOrder() {
            const order = [];
            tips.forEach((tip, index) => {
                if (tips.length > 1 && index === tips.length - 1) {
                    order.push({ kind: 'share' });
                }
                order.push({ kind: 'tip', tipIndex: index });
            });
            order.push({ kind: 'cta' });
            return order;
        }

        const slideOrder = buildSlideOrder();

        let currentSlidePos = -1;   // set by the first goToSlide() call
        let navToken = 0;           // bumped every navigation; guards every
                                     // in-flight timer/sound against firing
                                     // for a slide the person has left
        let pendingSlideTimeout = null;
        let stageTimeout;
        let countdownInterval;

        const progressBadgeElement = document.getElementById('progress-badge');
        const progressCountElement = document.getElementById('progress-count');
        const typeTagElement = document.getElementById('type-tag');
        const navPrevElement = document.getElementById('nav-prev');
        const navNextElement = document.getElementById('nav-next');

        const tipCardElement = document.getElementById('tip-card');
        const timerElement = document.getElementById('timer');
        const countdownElement = document.getElementById('countdown');

        const hookStageElement = document.getElementById('hook-stage');
        const contentStageElement = document.getElementById('content-stage');
        const whyStageElement = document.getElementById('why-stage');

        const hookTextElement = document.getElementById('hook-text');
        const contentTagElement = document.getElementById('content-tag');
        const mistakePanelElement = document.getElementById('mistake-panel');
        const mistakeImageElement = document.getElementById('mistake-image');
        const mistakeTextElement = document.getElementById('mistake-text');
        const approachPanelElement = document.getElementById('approach-panel');
        const approachImageElement = document.getElementById('approach-image');
        const approachTextElement = document.getElementById('approach-text');
        const whyTextElement = document.getElementById('why-text');
        const whySourceElement = document.getElementById('why-source');
        const revealFlashElement = document.getElementById('reveal-flash');
        const ctaButtonElement = document.getElementById('cta-button');

        function setActiveStage(name) {
            hookStageElement.classList.toggle('active', name === 'hook');
            contentStageElement.classList.toggle('active', name === 'content');
            whyStageElement.classList.toggle('active', name === 'why');
        }

        function populateComparePanel(imageEl, textEl, box) {
            const data = box || {};
            const hasText = !!data.text;
            const hasImage = !!data.image;

            if (hasText) {
                textEl.textContent = data.text;
                textEl.style.display = 'block';
            } else {
                textEl.textContent = '';
                textEl.style.display = 'none';
            }

            if (hasImage) {
                imageEl.onerror = function () {
                    // Missing/broken image: hide it and keep the rest of the
                    // tip (the other box, hook, why-it-works) working normally.
                    this.style.display = 'none';
                };
                imageEl.alt = data.imageAlt || '';
                imageEl.style.display = 'block';
                imageEl.src = data.image;
            } else {
                imageEl.onerror = null;
                imageEl.removeAttribute('src');
                imageEl.style.display = 'none';
            }
        }

        function populateContentStage(tip) {
            contentTagElement.textContent = tip.title;
            populateComparePanel(mistakeImageElement, mistakeTextElement, tip.mistake);
            populateComparePanel(approachImageElement, approachTextElement, tip.approach);

            mistakePanelElement.classList.remove('fade-out');
            approachPanelElement.classList.remove('spotlight');
        }

        function getContentStageDuration(tip) {
            const mistake = tip.mistake || {};
            const approach = tip.approach || {};
            const hasText = !!mistake.text || !!approach.text;
            const hasImage = !!mistake.image || !!approach.image;
            const textDuration = tip.readTime || DEFAULT_TEXT_READ_TIME;
            const imageDuration = tip.imageReadTime || DEFAULT_IMAGE_READ_TIME;

            if (hasText && hasImage) {
                return Math.max(textDuration, imageDuration);
            }
            if (hasImage) {
                return imageDuration;
            }
            return textDuration;
        }

        /* ============ COUNTER / TYPE TAG ============ */
        function updateChrome() {
            const slide = slideOrder[currentSlidePos];
            progressCountElement.textContent = `${currentSlidePos + 1} / ${slideOrder.length}`;

            if (slide.kind === 'tip') {
                typeTagElement.textContent = tips[slide.tipIndex].title;
            } else if (slide.kind === 'share') {
                typeTagElement.textContent = 'SHARE & FOLLOW';
            } else if (slide.kind === 'cta') {
                typeTagElement.textContent = 'BUILD YOUR CV';
            }
        }

        /* ============ TIP RENDERING (hook -> content -> why, auto-timed) ============
           Unchanged from the original auto-play sequence — the only new
           part is that it can now be entered from any direction (manual
           Prev/Next/swipe or the automatic end-of-tip advance) and every
           deferred step checks `token` against the live `navToken` so nothing
           left over from a slide the person has already navigated away
           from can still fire. */
        function renderTip(tip, direction, token) {
            showScreen('content');

            hookTextElement.textContent = tip.prompt;
            populateContentStage(tip);
            whyTextElement.textContent = tip.whyItWorks.text;
            if (tip.whyItWorks.source) {
                whySourceElement.textContent = `\u2014 ${tip.whyItWorks.source}`;
                whySourceElement.style.display = 'block';
            } else {
                whySourceElement.textContent = '';
                whySourceElement.style.display = 'none';
            }

            tipCardElement.classList.remove('enter', 'enter-reverse', 'exit', 'exit-reverse');
            void tipCardElement.offsetWidth;
            tipCardElement.classList.add(direction === 'backward' ? 'enter-reverse' : 'enter');

            pendingSlideTimeout = setTimeout(() => {
                if (token !== navToken) return;
                tipCardElement.classList.remove('enter', 'enter-reverse', 'exit', 'exit-reverse');
                runHookStage(tip, token);
            }, 50);
        }

        function runHookStage(tip, token) {
            setActiveStage('hook');
            AudioManager.playSwoosh('reveal', { startFreq: 1700, endFreq: 450, duration: 0.3, volume: 0.22 });
            const duration = tip.hookReadTime || estimateHookReadTime(tip.prompt);
            startTimerBar(duration, () => runContentStage(tip, token), token);
        }

        function runContentStage(tip, token) {
            setActiveStage('content');

            // The "reveal" moment: a quick flash + pop as both boxes appear,
            // giving the countdown from the hook stage a payoff.
            revealFlashElement.classList.remove('play');
            contentStageElement.classList.remove('reveal-pop');
            void contentStageElement.offsetWidth;
            revealFlashElement.classList.add('play');
            contentStageElement.classList.add('reveal-pop');
            AudioManager.playSwoosh('cards', { startFreq: 1500, endFreq: 500, duration: 0.28, volume: 0.2 });

            const duration = getContentStageDuration(tip);
            startTimerBar(duration, () => spotlightApproach(tip, token), token);
        }

        function spotlightApproach(tip, token) {
            // The timer has reached zero: reveal the stronger example with a
            // full-card highlight and a single ding, then move on.
            approachPanelElement.classList.add('spotlight');
            mistakePanelElement.classList.add('fade-out');
            AudioManager.playDing('ding');

            pendingSlideTimeout = setTimeout(() => {
                if (token !== navToken) return;
                runWhyStage(tip, token);
            }, 1800);
        }

        function runWhyStage(tip, token) {
            setActiveStage('why');
            AudioManager.playPop('why');
            const duration = tip.whyItWorks.readTime || DEFAULT_WHY_READ_TIME;
            startTimerBar(duration, () => {
                // Same automatic hand-off as before — the tip finishing its
                // "why it works" beat advances to whatever the next slide is
                // (another tip, the share screen, or the closing CTA).
                goToSlide(currentSlidePos + 1, 'forward');
            }, token);
        }

        function clearStageTimer() {
            clearTimeout(stageTimeout);
            clearInterval(countdownInterval);
            AudioManager.stop('timerTick');
        }

        function startTimerBar(duration, onComplete, token) {
            clearStageTimer();

            timerElement.classList.remove('ending');
            timerElement.style.transition = 'none';
            timerElement.style.width = '100%';

            void timerElement.offsetWidth;

            timerElement.style.transition = `width ${duration / 1000}s linear, background-color 0.5s`;
            timerElement.style.width = '0%';

            let secondsLeft = Math.ceil(duration / 1000);
            countdownElement.textContent = secondsLeft;
            countdownElement.classList.remove('hidden');

            // One tick per displayed second, synced to the same value the
            // countdown is showing — never a continuous/overlapping sound.
            if (secondsLeft >= 1) {
                AudioManager.playTick('timerTick');
            }

            countdownInterval = setInterval(() => {
                if (token !== navToken) {
                    clearInterval(countdownInterval);
                    return;
                }

                secondsLeft--;
                countdownElement.textContent = Math.max(secondsLeft, 0);

                if (secondsLeft <= 2) {
                    timerElement.classList.add('ending');
                }

                if (secondsLeft >= 1) {
                    AudioManager.playTick('timerTick');
                } else {
                    clearInterval(countdownInterval);
                    AudioManager.stop('timerTick');
                }
            }, 1000);

            stageTimeout = setTimeout(() => {
                if (token !== navToken) {
                    // A newer slide/stage has already started; this callback
                    // belongs to one that no longer exists.
                    return;
                }
                clearInterval(countdownInterval);
                AudioManager.stop('timerTick');
                onComplete();
            }, duration);
        }

        /* ============ CAROUSEL NAVIGATION ============
           Single entry point used by the automatic end-of-tip advance, the
           Previous/Next buttons, swipe gestures, and arrow keys alike, so
           every navigation path behaves identically. */
        function renderSlide(direction, token) {
            updateChrome();
            const slide = slideOrder[currentSlidePos];
            if (slide.kind === 'tip') {
                renderTip(tips[slide.tipIndex], direction, token);
            } else if (slide.kind === 'share') {
                renderShare(token);
            } else if (slide.kind === 'cta') {
                renderCta(token);
            }
        }

        function goToSlide(newPos, direction) {
            const total = slideOrder.length;
            const wrapped = ((newPos % total) + total) % total;

            // Stop whatever the outgoing slide had running (stage timer bar,
            // ticking sound, any deferred hand-off) immediately so nothing
            // from it can leak into the new slide.
            clearStageTimer();
            if (pendingSlideTimeout) {
                clearTimeout(pendingSlideTimeout);
                pendingSlideTimeout = null;
            }

            const leavingTip = currentSlidePos >= 0 && slideOrder[currentSlidePos].kind === 'tip';

            navToken++;
            const token = navToken;

            const render = () => {
                if (token !== navToken) return;
                currentSlidePos = wrapped;
                renderSlide(direction, token);
            };

            if (leavingTip) {
                // Preserve the original card slide-out animation + swoosh
                // before the next slide appears.
                tipCardElement.classList.remove('enter', 'enter-reverse', 'exit', 'exit-reverse');
                void tipCardElement.offsetWidth;
                tipCardElement.classList.add(direction === 'backward' ? 'exit-reverse' : 'exit');
                AudioManager.playSwoosh('transition', { startFreq: 900, endFreq: 1900, duration: 0.22, volume: 0.16 });
                pendingSlideTimeout = setTimeout(render, 500);
            } else {
                render();
            }
        }

        function nextSlide() {
            goToSlide(currentSlidePos + 1, 'forward');
        }

        function prevSlide() {
            goToSlide(currentSlidePos - 1, 'backward');
        }

        /* ============ NAVIGATION INPUT: buttons, swipe, keyboard ============ */
        navNextElement.addEventListener('click', nextSlide);
        navPrevElement.addEventListener('click', prevSlide);

        document.addEventListener('keydown', (event) => {
            if (document.getElementById('opening-screen').classList.contains('active')) return;
            if (event.key === 'ArrowRight') nextSlide();
            if (event.key === 'ArrowLeft') prevSlide();
        });

        let touchStartX = 0;
        let touchStartY = 0;
        let touchTracking = false;
        const SWIPE_THRESHOLD_PX = 45;

        document.addEventListener('touchstart', (event) => {
            if (document.getElementById('opening-screen').classList.contains('active')) return;
            const touch = event.changedTouches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            touchTracking = true;
        }, { passive: true });

        document.addEventListener('touchend', (event) => {
            if (!touchTracking) return;
            touchTracking = false;

            const touch = event.changedTouches[0];
            const deltaX = touch.clientX - touchStartX;
            const deltaY = touch.clientY - touchStartY;

            // Require a clearly horizontal, deliberate swipe so vertical
            // scrolling/taps are never mistaken for a slide change.
            if (Math.abs(deltaX) > SWIPE_THRESHOLD_PX && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
                if (deltaX < 0) {
                    nextSlide();
                } else {
                    prevSlide();
                }
            }
        }, { passive: true });

        /* ============ KICK EVERYTHING OFF ============ */
        document.addEventListener('DOMContentLoaded', runOpening);
