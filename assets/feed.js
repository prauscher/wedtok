// Feed DOM, slide construction (via <template>), playback observer, taps.

import { getMeta } from "./meta.js";
import {
	isLiked, addLike, removeLike,
	isMuted, setMutedPersisted,
	writeHash,
} from "./state.js";

const slideTpl = document.getElementById("slide-tpl");
const emptyTpl = document.getElementById("empty-tpl");
const burstTpl = document.getElementById("burst-tpl");

const DOUBLE_TAP_MS = 280;
const HINT_MS = 1800;

let currentSlide = null;
let observer = null;
let hintTimer = null;

// ---------- slide build ----------

function buildSlide(file) {
	const { author, caption } = getMeta(file);
	const slide = slideTpl.content.firstElementChild.cloneNode(true);
	slide.dataset.src = file;

	const video = slide.querySelector("video");
	video.src = file;
	video.muted = isMuted();

	slide.querySelector(".author").textContent = author;

	const cap = slide.querySelector(".caption");
	cap.textContent = caption;
	cap.addEventListener("click", (e) => {
		e.stopPropagation();
		cap.classList.toggle("clamped");
	});

	const likeBtn = slide.querySelector(".like");
	if (isLiked(file)) likeBtn.setAttribute("aria-pressed", "true");
	likeBtn.addEventListener("click", (e) => {
		e.stopPropagation();
		toggleLike(slide);
	});

	const fill = slide.querySelector(".progress-fill");
	video.addEventListener("timeupdate", () => {
		if (!video.duration) return;
		fill.style.width = (video.currentTime / video.duration * 100) + "%";
	});

	attachVideoTaps(slide, video);
	return slide;
}

function buildEmpty(text) {
	const slide = emptyTpl.content.firstElementChild.cloneNode(true);
	slide.textContent = text;
	return slide;
}

// ---------- likes ----------

function toggleLike(slide, { forceLike = false } = {}) {
	const file = slide.dataset.src;
	const btn = slide.querySelector(".like");
	const liked = isLiked(file);

	if (liked && !forceLike) {
		removeLike(file);
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

function attachVideoTaps(slide, _video) {
	let lastTap = 0;
	let singleTimer = null;

	slide.addEventListener("click", (e) => {
		if (e.target.closest(".meta") || e.target.closest(".actions")) return;
		const now = Date.now();
		if (now - lastTap < DOUBLE_TAP_MS) {
			lastTap = 0;
			clearTimeout(singleTimer);
			toggleLike(slide, { forceLike: true });
			return;
		}
		lastTap = now;
		clearTimeout(singleTimer);
		singleTimer = setTimeout(() => applyMute(slide.parentElement, !isMuted()), DOUBLE_TAP_MS);
	});
}

function applyMute(feedEl, v) {
	setMutedPersisted(v);
	for (const video of feedEl.querySelectorAll("video")) video.muted = v;
	if (!v && currentSlide) currentSlide.classList.remove("show-hint");
}

// ---------- mute hint ----------

function showMuteHint(slide) {
	if (!slide || !isMuted()) return;
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
			video.muted = isMuted();
			video.play().catch(() => {});
			writeHash(slide.dataset.src);
			showMuteHint(slide);
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

	const target = (targetFile && list.includes(targetFile)) ? targetFile : list[0];
	const targetSlide = [...feedEl.children].find((s) => s.dataset.src === target);
	if (targetSlide) targetSlide.scrollIntoView({ behavior: "instant", block: "start" });
	showMuteHint(targetSlide);
}

export function nextSlide(feedEl, dir) {
	const slides = [...feedEl.children].filter((s) => s.querySelector("video"));
	if (!slides.length || !currentSlide) return;
	const target = slides[slides.indexOf(currentSlide) + dir];
	if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
}
