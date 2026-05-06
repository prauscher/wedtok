import { getMode, setMode, parseHash, getLikes } from "./state.js";
import { renderFeed, nextSlide } from "./feed.js";

const feed = document.getElementById("feed");
const tabs = document.getElementById("tabs");

let allVideos = [];

function shuffle(arr) {
	const a = arr.slice();
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
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

(async function init() {
	const list = await (await fetch("videos.php")).json();
	allVideos = shuffle(list);

	const { mode, file } = parseHash();
	setMode(mode);
	syncTabs();
	renderFeed(feed, currentList(), file);
})();
