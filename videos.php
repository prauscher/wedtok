<?php

header("Content-Type: application/json");
print(json_encode(glob("videos/*.mp4")));

?>
