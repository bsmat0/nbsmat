/* Reusable, front-end-only brand opening. Tweak all intro behavior here. */
(() => {
  const SHOW_INTRO_ALWAYS = true;
  const INTRO = Object.freeze({
    enabled: true,
    durationMs: 4520,
    skipVisibleMs: 2700,
    logoTravelMs: 640,
    exitFadeMs: 650,
    storageKey: "bsmat-brand-intro-seen-v2"
  });
  const root = document.documentElement;
  let finishTimer;
  let travelTimer;
  let skipTimer;
  let audioContext;
  let audioUnlockHandler;
  const soundTimers = [];
  let dismissed = false;
  let soundStarted = false;
  let soundAvailable = true;

  const alreadySeen = () => {
    try { return sessionStorage.getItem(INTRO.storageKey) === "1"; }
    catch { return false; }
  };

  if (!INTRO.enabled || (!SHOW_INTRO_ALWAYS && alreadySeen())) return;
  root.classList.add("brand-intro-pending");

  const start = () => {
    const overlay = document.getElementById("brandIntro");
    const skip = document.getElementById("brandIntroSkip");
    if (!overlay || !skip) { root.classList.remove("brand-intro-pending"); return; }

    try { sessionStorage.setItem(INTRO.storageKey, "1"); } catch { /* Storage may be unavailable in private browsing. */ }

    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;
      document.removeEventListener("pointerdown", audioUnlockHandler);
      document.removeEventListener("keydown", audioUnlockHandler);
      window.clearTimeout(finishTimer);
      window.clearTimeout(travelTimer);
      window.clearTimeout(skipTimer);
      soundTimers.forEach(window.clearTimeout);
      if (audioContext && audioContext.state !== "closed") audioContext.close().catch(() => {});
      overlay.classList.add("is-leaving");
      window.setTimeout(() => {
        root.classList.remove("brand-intro-pending");
        overlay.remove();
      }, INTRO.exitFadeMs);
    };

    skip.textContent = "المس الشاشة لتشغيل صوت الافتتاحية";
    skip.setAttribute("aria-label", "تشغيل صوت الافتتاحية");
    skip.addEventListener("click", (event) => { event.preventDefault(); attemptSound(); });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && soundStarted && !dismissed) dismiss();
    }, { once: true });

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      const frequencies = [220, 293.66, 349.23, 392, 440, 523.25];

      const playSequence = () => {
        if (dismissed || soundStarted || !audioContext || audioContext.state !== "running") return;
        soundStarted = true;
        skip.classList.add("is-hidden");
        scheduleIntroFinish();
        frequencies.forEach((frequency, index) => {
          const timer = window.setTimeout(() => {
            if (dismissed || !audioContext || audioContext.state !== "running") return;
            const oscillator = audioContext.createOscillator();
            const envelope = audioContext.createGain();
            const now = audioContext.currentTime;
            oscillator.type = "sine";
            oscillator.frequency.setValueAtTime(frequency, now);
            envelope.gain.setValueAtTime(0.0001, now);
            envelope.gain.exponentialRampToValueAtTime(0.09, now + 0.025);
            envelope.gain.exponentialRampToValueAtTime(0.0001, now + 0.23);
            oscillator.connect(envelope);
            envelope.connect(audioContext.destination);
            oscillator.start(now);
            oscillator.stop(now + 0.24);
          }, index * 310);
          soundTimers.push(timer);
        });
      };
      const attemptSound = () => {
        if (dismissed || audioContext?.state === "running") return;
        try {
          if (!audioContext || audioContext.state === "closed") audioContext = new AudioContextClass();
          audioContext.resume().then(playSequence).catch(() => {});
        } catch { /* Keep the visual intro independent from audio availability. */ }
      };
      audioUnlockHandler = () => { attemptSound(); };
      document.addEventListener("pointerdown", audioUnlockHandler);
      document.addEventListener("keydown", audioUnlockHandler);
      attemptSound();
    } else {
      soundAvailable = false;
    }

    const scheduleIntroFinish = () => {
      if (dismissed || finishTimer) return;
      skipTimer = window.setTimeout(() => skip.classList.add("is-hidden"), INTRO.skipVisibleMs);
      finishTimer = window.setTimeout(travelToOriginalLogo, INTRO.durationMs - INTRO.logoTravelMs - INTRO.exitFadeMs);
    };

    const travelToOriginalLogo = () => {
      const officialLogo = overlay.querySelector(".brand-intro-official");
      const target = overlay.dataset.introTarget && document.querySelector(overlay.dataset.introTarget);
      if (!officialLogo || !target) { dismiss(); return; }

      const from = officialLogo.getBoundingClientRect();
      const to = target.getBoundingClientRect();
      if (!from.width || !from.height || !to.width || !to.height) { dismiss(); return; }

      const dx = to.left + to.width / 2 - (from.left + from.width / 2);
      const dy = to.top + to.height / 2 - (from.top + from.height / 2);
      const sx = to.width / from.width;
      const sy = to.height / from.height;
      overlay.classList.add("is-traveling");
      officialLogo.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(${sx}, ${sy})`;
      travelTimer = window.setTimeout(dismiss, INTRO.logoTravelMs);
    };

    // Mobile browsers unlock audio on the first touch; keep the intro until then.
    if (!soundAvailable) scheduleIntroFinish();

    window.BSMATBrandIntro = Object.freeze({ settings: INTRO, dismiss });
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
