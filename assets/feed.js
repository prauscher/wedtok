// Feed DOM, slide construction (via <template>), playback observer, taps.

import {
	isLiked, addLike, removeLike,
	isMuted, setMutedPersisted,
	writeHash,
} from "./state.js";

const slideTpl = document.getElementById("slide-tpl");
const emptyTpl = document.getElementById("empty-tpl");
const burstTpl = document.getElementById("burst-tpl");

const DOUBLE_TAP_MS = 280;
const HINT_MS = 1000;
const KEEP_BEHIND = 5;

let currentSlide = null;
let observer = null;
let hintTimer = null;
let firstPlay = true;
let hintShown = false;

// ---------- slide build ----------

function buildSlide(file) {
	const caption = file.caption + " " + file.tags.join(" ");
	const slide = slideTpl.content.firstElementChild.cloneNode(true);
	slide.dataset.src = file.url;

	const video = slide.querySelector("video");
	video.src = file.url;
	video.muted = isMuted();

	slide.querySelector(".author").textContent = file.author;

	const cap = slide.querySelector(".caption");
	cap.textContent = caption;
	cap.addEventListener("click", (e) => {
		e.stopPropagation();
		cap.classList.toggle("clamped");
	});

	const likeBtn = slide.querySelector(".like");
	if (isLiked(file.url)) likeBtn.setAttribute("aria-pressed", "true");
	likeBtn.addEventListener("click", (e) => {
		e.stopPropagation();
		toggleLike(slide, file);
	});

	const fill = slide.querySelector(".progress-fill");
	video.addEventListener("timeupdate", () => {
		if (!video.duration) return;
		fill.style.width = (video.currentTime / video.duration * 100) + "%";
	});

	attachVideoTaps(slide, video, file);
	return slide;
}

function buildEmpty(text) {
	const slide = emptyTpl.content.firstElementChild.cloneNode(true);
	slide.textContent = text;
	return slide;
}

// ---------- likes ----------

function toggleLike(slide, file, { forceLike = false } = {}) {
	const btn = slide.querySelector(".like");
	const liked = isLiked(file.url);

	if (liked && !forceLike) {
		removeLike(file.url);
		btn.setAttribute("aria-pressed", "false");
		return;
	}
	if (!liked) {
		addLike(file);
		btn.setAttribute("aria-pressed", "true");
	}
	spawnBurst(slide);
}

function spawnBurst(slide) {
	slide.querySelector(".burst")?.remove();
	const burst = burstTpl.content.firstElementChild.cloneNode(true);
	slide.appendChild(burst);
	setTimeout(() => burst.remove(), 700);
}

// ---------- tap handling ----------

function attachVideoTaps(slide, video, file) {
	let lastTap = 0;
	let singleTimer = null;

	slide.addEventListener("click", (e) => {
		if (e.target.closest(".meta") || e.target.closest(".actions")) return;
		const now = Date.now();
		if (now - lastTap < DOUBLE_TAP_MS) {
			lastTap = 0;
			clearTimeout(singleTimer);
			toggleLike(slide, file, { forceLike: true });
			return;
		}
		lastTap = now;
		clearTimeout(singleTimer);
		singleTimer = setTimeout(() => applyMute(slide.parentElement, !video.muted), DOUBLE_TAP_MS);
	});
}

function applyMute(feedEl, v) {
	setMutedPersisted(v);
	for (const video of feedEl.querySelectorAll("video")) video.muted = v;
	if (!v && currentSlide) currentSlide.classList.remove("show-hint");
}

// ---------- mute hint ----------

function showMuteHint(slide) {
	if (!slide || hintShown) return;
	const v = slide.querySelector("video");
	if (!v || !v.muted) return;
	hintShown = true;
	slide.classList.add("show-hint");
	clearTimeout(hintTimer);
	hintTimer = setTimeout(() => slide.classList.remove("show-hint"), HINT_MS);
}

// ---------- observer ----------

function setupObserver(feedEl) {
	observer?.disconnect();
	observer = new IntersectionObserver((entries) => {
		for (const e of entries) {
			if (!(e.isIntersecting && e.intersectionRatio >= 0.6)) continue;
			const slide = e.target;
			const video = slide.querySelector("video");
			if (!video) continue;

			if (currentSlide && currentSlide !== slide) {
				const prev = currentSlide.querySelector("video");
				if (prev) { prev.pause(); prev.currentTime = 0; }
			}
			currentSlide = slide;
			updatePreloadWindow(feedEl, slide);
			video.muted = firstPlay ? true : isMuted();
			firstPlay = false;
			video.play().catch(() => {});
			writeHash(slide.dataset.src);
			showMuteHint(slide);
			feedEl.dispatchEvent(new CustomEvent("slidechange", {
				detail: { index: [...feedEl.children].indexOf(slide), total: feedEl.children.length },
			}));
		}
	}, { root: feedEl, threshold: [0, 0.6, 1] });

	for (const slide of feedEl.children) {
		if (slide.querySelector("video")) observer.observe(slide);
	}
}

function updatePreloadWindow(feedEl, slide) {
	const slides = [...feedEl.children];
	const idx = slides.indexOf(slide);
	slides.forEach((s, i) => {
		const v = s.querySelector("video");
		if (v) v.preload = (Math.abs(i - idx) <= 1) ? "auto" : "metadata";
	});
}

// ---------- public ----------

export function renderFeed(feedEl, list, targetFile) {
	feedEl.innerHTML = "";
	currentSlide = null;

	if (list.length === 0) {
		feedEl.appendChild(buildEmpty("no likes yet ♥ tap the heart on a video"));
		return;
	}

	for (const f of list) feedEl.appendChild(buildSlide(f));
	setupObserver(feedEl);

	const target = (targetFile && list.some((v) => v.url === targetFile)) ? targetFile : list[0].url;
	const targetSlide = [...feedEl.children].find((s) => s.dataset.src === target);
	if (targetSlide) targetSlide.scrollIntoView({ behavior: "instant", block: "start" });
	showMuteHint(targetSlide);
}

export function appendSlides(feedEl, list) {
	for (const f of list) {
		const slide = buildSlide(f);
		feedEl.appendChild(slide);
		observer?.observe(slide);
	}
	if (currentSlide) updatePreloadWindow(feedEl, currentSlide);
	pruneOld(feedEl);
}

function pruneOld(feedEl) {
	if (!currentSlide) return;
	while (true) {
		const currentIdx = [...feedEl.children].indexOf(currentSlide);
		if (currentIdx <= KEEP_BEHIND) break;
		const first = feedEl.firstElementChild;
		if (!first || first === currentSlide) break;
		observer?.unobserve(first);
		const v = first.querySelector("video");
		if (v) { v.pause(); v.removeAttribute("src"); v.load(); }
		first.remove();
	}
}

export function nextSlide(feedEl, dir) {
	const slides = [...feedEl.children].filter((s) => s.querySelector("video"));
	if (!slides.length || !currentSlide) return;
	const target = slides[slides.indexOf(currentSlide) + dir];
	if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
}
