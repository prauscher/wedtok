// Feed DOM, slide construction (via <template>), playback observer, taps.

import {
	isLiked, addLike, removeLike,
	writeHash, buildURL,
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
let hintShown = false;
let clipboardHintTimer = null;
let pruning = false;

// ---------- slide build ----------

function buildSlide(file) {
	const caption = file.caption + " " + file.tags.join(" ");
	const slide = slideTpl.content.firstElementChild.cloneNode(true);
	slide.dataset.fileid = file.fileid;
	slide.dataset.src = file.url;

	const video = slide.querySelector("video");
	video.preload = "none";
	video.src = file.url;
	video.muted = true;

	slide.querySelector(".author").textContent = file.author;

	const cap = slide.querySelector(".caption");
	cap.textContent = caption;
	cap.addEventListener("click", (e) => {
		e.stopPropagation();
		slide.parentElement.classList.toggle("caption-clamped");
	});

	const shareData = {
		"url": buildURL(slide),
		"title": "WedTok",
	};
	const shareBtn = slide.querySelector(".share");
	shareBtn.addEventListener("click", (e) => {
		e.stopPropagation();
		if (navigator.canShare?.(shareData)) {
			navigator.share(shareData);
		} else {
			navigator.clipboard.writeText(shareData.url).then(() => {
				const hint = document.getElementById("clipboard-hint");
				hint.classList.add("show-hint");
				clearTimeout(clipboardHintTimer);
				clipboardHintTimer = setTimeout(() => hint.classList.remove("show-hint"), HINT_MS);
			});
		}
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
		if (pruning) return;
		for (const e of entries) {
			if (!(e.isIntersecting && e.intersectionRatio >= 0.6)) continue;
			const slide = e.target;
			const video = slide.querySelector("video");
			if (!video) continue;

			const oldFileId = currentSlide ? currentSlide.dataset.fileid : null;
			const prev = currentSlide ? currentSlide.querySelector("video") : null;
			if (oldFileId === slide.dataset.fileid) continue;

			console.log(`[scroll] oldId=${oldFileId}, new=${slide.dataset.fileid}`);
			if (prev) { prev.pause(); prev.currentTime = 0; }

			currentSlide = slide;
			updatePreloadWindow(feedEl);
			video.muted = prev ? prev.muted : true;
			video.play().catch(() => {});
			writeHash(currentSlide);
			showMuteHint(currentSlide);
			feedEl.dispatchEvent(new CustomEvent("slidechange", {
				detail: { index: [...feedEl.children].indexOf(slide), total: feedEl.children.length },
			}));
			break;
		}
	}, { root: feedEl, threshold: [0, 0.6, 1] });

	for (const slide of feedEl.children) {
		if (slide.querySelector("video")) observer.observe(slide);
	}
}

function updatePreloadWindow(feedEl) {
	const slides = [...feedEl.children];
	const idx = slides.indexOf(currentSlide);
	slides.forEach((s, i) => {
		const v = s.querySelector("video");
		if (v) v.preload = (Math.abs(i - idx) <= 1) ? "auto" : "none";
	});
}

// ---------- public ----------

export function renderFeed(feedEl, list) {
	feedEl.innerHTML = "";
	currentSlide = null;

	if (list.length === 0) {
		feedEl.appendChild(buildEmpty("no likes yet ♥ tap the heart on a video"));
		return;
	}

	for (const f of list) feedEl.appendChild(buildSlide(f));
	setupObserver(feedEl);

	const startSlide = feedEl.children[0];
	showMuteHint(startSlide);
}

export function appendSlides(feedEl, list) {
	for (const f of list) {
		const slide = buildSlide(f);
		feedEl.appendChild(slide);
		observer?.observe(slide);
	}
	if (currentSlide) updatePreloadWindow(feedEl);
	pruneOld(feedEl);
}

function pruneOld(feedEl) {
	if (!currentSlide || pruning) return;
	pruning = true;
	console.log(`[pruneOld] locked`);
	try {
		while (true) {
			const currentIdx = [...feedEl.children].indexOf(currentSlide);
			console.log(`[pruneOld] currentSlide=${!!currentSlide}, currentIdx=${currentIdx}`);
			if (currentIdx <= KEEP_BEHIND) break;
			const first = feedEl.firstElementChild;
			if (!first || first === currentSlide) break;
				observer?.unobserve(first);
			const v = first.querySelector("video");
			if (v) { v.pause(); v.removeAttribute("src"); v.load(); }
			first.remove();
		}
	} finally {
		console.log(`[pruneOld] unlock`);
		pruning = false;
	}
	currentSlide.scrollIntoView({ behavior: "instant", block: "start" });
}

export function nextSlide(feedEl, dir) {
	const slides = [...feedEl.children].filter((s) => s.querySelector("video"));
	if (!slides.length || !currentSlide) return;
	const target = slides[slides.indexOf(currentSlide) + dir];
	if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
}
