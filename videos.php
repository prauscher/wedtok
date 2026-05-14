<?php

$authors = [
	"@laura", "@laura_22",
        "@alice", "@alice_99",
        "@ugly_fat_joe",
        "@jasper", "@jasper_07",
        "@sebihindert",
        "@patrick", "@patrick_42",
        "@julius", "@julius_404",
        "@conny", "@conny_xo",
        "@anna",
        "@bine", "@bine_official",
        "@moni", "@moni_07",
];

$caption_heads = [
	"no caption needed", "this one", "literally me right now", "guys look",
	"had to share", "the vibe", "best moment", "POV", "when you see it",
	"wait for it", "stop", "obsessed", "the energy here", "moment of the night",
	"screaming", "iconic", "I cant", "absolute cinema", "real ones know",
	"caught in 4k", "send tweet", "core memory unlocked", "no thoughts head empty",
	"someone please explain", "we need to talk about this",
];

$caption_tails = [
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

$emojis = ["", " ✨", " 😭", " 🍾", " 💍", " 🥹", " 🕺", " 💃", " 🎉", " 🤍", " 😂", " 🔥", " 💀", " 🫶", " 🥲"];

$hashtags = [
	"#wedding", "#wedtok", "#family", "#love", "#vibes", "#unreal", "#sendhelp",
	"#obsessed", "#rewind", "#coreMemory", "#moment", "#fyp", "#foryou", "#squad",
	"#legends", "#magic", "#saved", "#latergram", "#brainrot", "#behindthescenes",
	"#raw", "#crew", "#nofilter", "#masterclass", "#icons", "#chaosgood",
	"#lifeUpdate", "#realones",
];

header("Content-Type: application/json");

$seed = isset($_GET['seed']) ? intval($_GET['seed']) : 0;
$offset = isset($_GET['offset']) ? max(0, intval($_GET['offset'])) : 0;
$n = isset($_GET['n']) ? min(20, max(1, intval($_GET['n']))) : 5;

function build_fileid($filename) {
	return hexdec(substr(md5($filename),0,8));
}

function pseudorandom($fileid) {
	global $seed;
	return hexdec(substr(md5($seed . "#" . $fileid), 0, 8));
}

$start_random = isset($_GET['start_fileid']) ? pseudorandom(intval(($_GET['start_fileid'])) : 0;

$urls = glob("videos/*.mp4");
usort($urls, function ($a, $b) {global $start_random; return (pseudorandom(build_fileid($b)) - $start_random) - (pseudorandom(build_fileid($a)) - $start_random);});
$urls = array_slice($urls, $offset, $n);

function select_modulo($list, $i) {
	return $list[$i % count($list)];
}

$videos = [];
foreach ($urls as $url) {
	$h = hexdec(hash("fnv1a32", $url));

	$caption = select_modulo($caption_heads, $h >> 5) . select_modulo($emojis, $h >> 16) . select_modulo($caption_tails, $h >> 10);

	$hashtag_count = (($h >> 20) % 3) + 1;  // 1..3 tags
	$hashtag_start = ($h >> 24) % count($hashtags);
	$hashtag_step = (($h >> 12) % (count($hashtags) - 1)) + 1;  // coprime-ish stride
	$hashtags = [];

	for ($i = 0; $i < $hashtag_count; $i++) {
		$idx = ($start + $i * $step) % count($hashtags);
		$hashtags[] = $hashtags[($start + $i * $step) % count($hashtags)];
	}
	$hashtags = array_unique($hashtags);

	$videos[] = array(
		"fileid" => build_fileid($url),
		"url" => $url,
		"author" => select_modulo($authors, $h),
		"caption" => $caption,
		"hashtags" => $hashtags,
	);
}
print(json_encode($videos));

?>
