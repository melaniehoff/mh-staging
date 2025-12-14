<?php
require_once "utils.php";

// the requested URI
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// remove leading slash for easier handling
$requestedFile = ltrim($requestUri, '/');
$filePath = SRC_DIR . '/' . $requestedFile;

// if the request is for the root directory or a folder, check for index files
if ($requestUri === '/' || substr($requestUri, -1) === '/') {
    // check for /index.html or /subfolder/index.html
    $indexHtml = SRC_DIR . $requestUri . 'index.html';
    if (file_exists($indexHtml)) {
        readfile($indexHtml); // Serve the index.html file
        return true;
    }

    // check for /dist/index.html or /dist/subfolder/index.html
    $distHtml = DIST_DIR . $requestUri . 'index.html';
    if (file_exists($distHtml)) {
        readfile($distHtml); // Serve the cached index.html file
        return true;
    }

    // check for /index.md or /subfolder/index.md
    $relPath = $requestUri . 'index.md';
    $indexMarkdown = SRC_DIR . $relPath;
    if (file_exists($indexMarkdown)) {
        // handle this route later as /cms/render.php/file.md
        $requestedFile = "/cms/render.php" . $relPath;
    }
}

// if the request file exists, then serve it as it is
// (this is for all files that are not .php or .md)
if (file_exists($filePath) && is_file($filePath)) {
    return false;
}

// if the requested file doesn't contain .php
if (!preg_match('/\.php/' , $requestedFile)) {

    // first try file.html
    $htmlFile = SRC_DIR . '/' . $requestedFile . '.html';
    if (file_exists($htmlFile)) {
        readfile($htmlFile);  // serve directly if found
        return true;
    }

    // then try dist/file.html
    $htmlFile = DIST_DIR . $requestedFile . '.html';
    if (file_exists($htmlFile)) {
        readfile($htmlFile);  // serve directly if found
        return true;
    }

    // then try file.md, and pass to render.php if found
    $markdownFile = SRC_DIR . '/' . $requestedFile . '.md';
    if (file_exists($markdownFile)) {
        // handle this route later as /cms/render.php?file.md
        $requestedFile = "/cms/render.php/" . $requestedFile . '.md';
    }
}

// Regular expression to split a url between the script name and the path afterwards
// e.g. /cms/edit.php/blue.md gets split into /cms/edit.php and /blue.md
$pattern = '/(\/[^\/]+\.php)(\/.*)$/';

// Check if the pattern matches
if (preg_match($pattern, $requestedFile, $matches)) {
    $script = ltrim($matches[1], '/');
    $path = $matches[2];
    $_SERVER['PATH_INFO'] = $path;
    chdir(SRC_DIR . "/cms");
    include $script;
    return true;
} else {
    echo "No match found.\n";
}

// if no match, return a 404 error
http_response_code(404);
echo "404 Not Found";