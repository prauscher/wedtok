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
$urls = glob("videos/*.mp4");

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
