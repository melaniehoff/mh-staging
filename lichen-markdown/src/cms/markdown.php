<?php

require_once "vendor/php-markdown-lib-9.1/Michelf/MarkdownExtra.inc.php";

use Michelf\MarkdownExtra;

function markdown_to_html($file)
{
	$source = "";

	while (!feof($file)) {
		$source = $source . fgets($file);
	}

	$html = MarkdownExtra::defaultTransform($source);


	return $html;
}
