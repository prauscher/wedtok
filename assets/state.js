// Persisted state (likes, muted) and URL hash routing.

const LIKES_KEY = "wedtok.likes";
const MUTED_KEY = "wedtok.muted";

const likes = loadLikes();
let muted = loadMuted();
let mode = "all";

function loadLikes() {
	try {
		const raw = JSON.parse(localStorage.getItem(LIKES_KEY) || "[]");
		return new Set(Array.isArray(raw) ? raw : []);
	} catch {
		return new Set();
	}
}
function saveLikes() {
	localStorage.setItem(LIKES_KEY, JSON.stringify([...likes]));
}
function loadMuted() {
	const v = localStorage.getItem(MUTED_KEY);
	return v === null ? true : v === "1";
}

export function getLikes() { return likes; }
export function isLiked(file) { return likes.has(file); }
export function addLike(file) { likes.add(file); saveLikes(); }
export function removeLike(file) { likes.delete(file); saveLikes(); }

export function isMuted() { return muted; }
export function setMutedPersisted(v) {
	muted = !!v;
	localStorage.setItem(MUTED_KEY, muted ? "1" : "0");
}

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
