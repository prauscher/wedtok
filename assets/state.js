// Persisted state (likes) and URL hash routing.

const LIKES_KEY = "wedtok.likes";

const likes = loadLikes();
let mode = "all";

//since we changed the indexing for the localStorage, we need to check for old keys
function isValidVideo(v) {
	return v && typeof v === "object" && typeof v.url === "string" && typeof v.author === "string";
}
function loadLikes() {
	let raw;
	try {
		raw = JSON.parse(localStorage.getItem(LIKES_KEY) || "[]");
	} catch {
		raw = [];
	}
	if (!Array.isArray(raw)) raw = [];
	const clean = raw.filter(isValidVideo);
	const map = new Map(clean.map((v) => [v.url, v]));
	if (clean.length !== raw.length) {
		localStorage.setItem(LIKES_KEY, JSON.stringify([...map.values()]));
	}
	return map;
}
function saveLikes() {
	localStorage.setItem(LIKES_KEY, JSON.stringify([...likes.values()]));
}

export function getLikes() { return [...likes.values()]; }
export function isLiked(url) { return likes.has(url); }
export function addLike(video) { likes.set(video.url, video); saveLikes(); }
export function removeLike(url) { likes.delete(url); saveLikes(); }

export function getMode() { return mode; }
export function setMode(m) { mode = (m === "liked") ? "liked" : "all"; }

function urlSafeEncode(s) {
	return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function urlSafeDecode(s) {
	try {
		return decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/"))));
	} catch {
		return null;
	}
}

export function parseHash() {
	const h = location.hash.replace(/^#/, "");
	if (!h) return { mode: "all", file: null };
	const parts = h.split("/");
	if (parts.length === 2 && (parts[0] === "all" || parts[0] === "liked")) {
		return { mode: parts[0], file: urlSafeDecode(parts[1]) };
	}
	return { mode: "all", file: urlSafeDecode(h) };
}

export function writeHash(file) {
	const next = "#" + mode + "/" + urlSafeEncode(file);
	if (location.hash !== next) history.replaceState(null, "", next);
}
