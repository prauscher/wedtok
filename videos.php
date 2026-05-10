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

header("Content-Type: application/json");

$seed = isset($_GET['seed']) ? intval($_GET['seed']) : 0;
$offset = isset($_GET['offset']) ? max(0, intval($_GET['offset'])) : 0;
$n = isset($_GET['n']) ? min(20, max(1, intval($_GET['n']))) : 5;

$urls = glob("videos/*.mp4");
sort($urls);
if ($seed) {
	mt_srand($seed);
	for ($i = count($urls) - 1; $i > 0; $i--) {
		$j = mt_rand(0, $i);
		$tmp = $urls[$i]; $urls[$i] = $urls[$j]; $urls[$j] = $tmp;
	}
}
$urls = array_slice($urls, $offset, $n);

$videos = [];
foreach ($urls as $url) {
	$author_i = hexdec(hash("fnv1a32", $url)) % count($authors);
	$videos[] = array(
		"url" => $url,
		"author" => $authors[$author_i],
	);
}
print(json_encode($videos));

?>
