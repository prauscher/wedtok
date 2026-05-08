// Deterministic per-filename author + caption generator.
// Same filename always yields same metadata so likes/UI stay stable across reloads.

const CAPTION_HEADS = [
	"no caption needed", "this one", "literally me right now", "guys look",
	"had to share", "the vibe", "best moment", "POV", "when you see it",
	"wait for it", "stop", "obsessed", "the energy here", "moment of the night",
	"screaming", "iconic", "I cant", "absolute cinema", "real ones know",
	"caught in 4k", "send tweet", "core memory unlocked", "no thoughts head empty",
	"someone please explain", "we need to talk about this",
];

const CAPTION_TAILS = [
	"", // occasional short caption to vary the rhythm
	" and yes I rewatched this approximately fourteen times because I refuse to accept that the night is over and we are all back in our regular lives where nothing this good happens anymore",
	" no but seriously this is the kind of footage you put in the family group chat and then everyone replies within thirty seconds because we genuinely cannot help ourselves we are obsessed with each other and that is just the truth",
	" the way I have been quoting this for three days straight to anyone who will listen including my coworkers who have absolutely no idea what I am talking about but they politely nod and that is honestly enough for me",
	" honestly thinking about printing this out and framing it for the hallway because nothing else has captured the entire spirit of the weekend quite the way these few seconds did and I will not be taking questions",
	" you ever just sit and watch a clip on loop until you can predict every single frame yes well welcome to my last 48 hours apparently and I am not even sorry about it not even a little bit",
	" I keep telling people you had to be there but actually no this video does most of the heavy lifting and the rest is just my unhinged commentary which is admittedly a lot but also accurate",
	" can we please appreciate that this happened in real life with real people in front of real cameras because I genuinely cannot believe this is a documented event and not a fever dream I made up",
	" putting this on the family christmas card next year and absolutely nothing anyone says will convince me otherwise we are committing to the bit and committing hard",
	" I am writing this caption from the floor where I have been laying since the moment I rewatched this for the seventh time and honestly I think this might just be where I live now",
	" started showing this to strangers on the train today because keeping it to myself was no longer a viable option for my mental health and they all agreed it was elite content",
];

const EMOJIS = ["", " ✨", " 😭", " 🍾", " 💍", " 🥹", " 🕺", " 💃", " 🎉", " 🤍", " 😂", " 🔥", " 💀", " 🫶", " 🥲"];

const HASHTAGS = [
	"#wedding", "#wedtok", "#family", "#love", "#vibes", "#unreal", "#sendhelp",
	"#obsessed", "#rewind", "#coreMemory", "#moment", "#fyp", "#foryou", "#squad",
	"#legends", "#magic", "#saved", "#latergram", "#brainrot", "#behindthescenes",
	"#raw", "#crew", "#nofilter", "#masterclass", "#icons", "#chaosgood",
	"#lifeUpdate", "#realones",
];

function fnv1a(str) {
	let h = 2166136261 >>> 0;
	for (let i = 0; i < str.length; i++) {
		h ^= str.charCodeAt(i);
		h = Math.imul(h, 16777619) >>> 0;
	}
	return h;
}

function pickHashtags(h) {
	const count = ((h >>> 20) % 3) + 1; // 1..3 tags
	const start = (h >>> 24) % HASHTAGS.length;
	const step = ((h >>> 12) % (HASHTAGS.length - 1)) + 1; // coprime-ish stride
	const picked = [];
	const seen = new Set();
	for (let i = 0; i < count; i++) {
		const idx = (start + i * step) % HASHTAGS.length;
		if (seen.has(idx)) continue;
		seen.add(idx);
		picked.push(HASHTAGS[idx]);
	}
	return " " + picked.join(" ");
}

export function getCaption(file) {
	const h = fnv1a(file.url);
	const head = CAPTION_HEADS[(h >>> 5) % CAPTION_HEADS.length];
	const tail = CAPTION_TAILS[(h >>> 10) % CAPTION_TAILS.length];
	const emoji = EMOJIS[(h >>> 16) % EMOJIS.length];
	const tags = pickHashtags(h);
	return head + emoji + tail + tags;
}
