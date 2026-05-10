import { getMode, setMode, parseHash, getLikes } from "./state.js";
import { renderFeed, appendSlides, nextSlide } from "./feed.js";

const feed = document.getElementById("feed");
const tabs = document.getElementById("tabs");

const CHUNK = 5;
let allVideos = [];
let refilling = false;
let seed = newSeed();
let offset = 0;

function newSeed() {
	return Math.floor(Math.random() * 42) + 1;
}

async function fetchChunk() {
	let chunk = await (await fetch(`videos.php?seed=${seed}&offset=${offset}&n=${CHUNK}`)).json();
	if (!chunk.length) {
		seed = newSeed();
		offset = 0;
		console.log(`[fetch] pool exhausted, new pass seed=${seed}`);
		chunk = await (await fetch(`videos.php?seed=${seed}&offset=${offset}&n=${CHUNK}`)).json();
	}
	offset += chunk.length;
	console.log(`[fetch] got ${chunk.length} videos (seed=${seed}, next offset=${offset})`);
	return chunk;
}

function currentList() {
	if (getMode() === "liked") {
		return [...getLikes()].filter((f) => allVideos.includes(f));
	}
	return allVideos;
}

function syncTabs() {
	for (const b of tabs.querySelectorAll("button")) {
		b.classList.toggle("active", b.dataset.mode === getMode());
	}
}

tabs.addEventListener("click", (e) => {
	const btn = e.target.closest("button[data-mode]");
	if (!btn || btn.dataset.mode === getMode()) return;
	setMode(btn.dataset.mode);
	syncTabs();
	renderFeed(feed, currentList(), null);
});

addEventListener("keydown", (e) => {
	if (e.code === "ArrowDown" || e.code === "Space") { e.preventDefault(); nextSlide(feed, 1); }
	else if (e.code === "ArrowUp") { e.preventDefault(); nextSlide(feed, -1); }
});

async function refill() {
	if (refilling) return;
	refilling = true;
	try {
		const chunk = await fetchChunk();
		if (!chunk.length) return;
		allVideos.push(...chunk);
		if (getMode() === "all") appendSlides(feed, chunk);
	} finally {
		refilling = false;
	}
}

feed.addEventListener("slidechange", (e) => {
	if (getMode() !== "all") return;
	const { index, total } = e.detail;
	if (total - index - 1 < 3) refill();
});

(async function init() {
	allVideos = await fetchChunk();

	const { mode, file } = parseHash();
	setMode(mode);
	syncTabs();
	renderFeed(feed, currentList(), file);
})();
