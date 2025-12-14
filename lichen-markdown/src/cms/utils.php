<?php
require_once "markdown.php";

// constants and configurations for the whole program
define('SRC_DIR', dirname(__DIR__));
define('DIST_DIR', SRC_DIR . '/dist');

/**
 *
 * Get the page title according to the following priorities:
 * 
 * 1. get explicit page title
 * 2. get explicit header title
 * 3. get implicit header title
 * 4. get implicit page title
 *
 *
 * @param   string  $header The html of the header
 * @param   string  $body The html of the body
 * @return  string  The title 
 *
 */
function get_title($header, $body)
{
    // Get explicit page title
    preg_match_all('|<!-- TITLE:(.*) -->|', $body, $matches);
    $title = trim(implode($matches[1]));

    // Else get explicit header title
    if ($title == '') {
        preg_match_all('|<!-- TITLE:(.*) -->|', $header, $matches);
        $title = trim(implode($matches[1]));
    }

    // Else get implicit header title
    if ($title == '') {
        preg_match_all('|<h[^>]+>(.*)</h[^>]+>|iU', $header, $headings);
        $title = trim(implode($headings[1]));
    }

    // Else get implicit body title
    if ($title == '') {
        preg_match_all('|<h[^>]+>(.*)</h[^>]+>|iU', $body, $headings);
        $title = trim(implode($headings[1]));
    }

    return $title;
}


/**
*   render_func takes in
*   - path: a string path to the markdown file to be rendered
*   - ext: a string of the file extension (.md)
*   - _src: an open file handle for the file
*
*   and it returns a string of the HTML file rendered from that markdown file,
*   with appropriate headers and title
*
*/
function render_func($path, $ext, $_src) {

     // Get rendered html and parse metadata title
    if ($ext == "md") {
        $body = markdown_to_html($_src);
    }
    fclose($_src);

    // Handle header and footer
    $header = null;
    $footer = null;
    $headerTitle = null;
    // When header or footer is being edited / displayed, don't display in layout
    $displayLayout = !strpos($path, 'header.md') && !strpos($path, 'footer.md');

    if ($displayLayout) {
        if (file_exists('../header.md')) {
            $header_src = fopen('../header.md', 'r');
            $header = markdown_to_html($header_src);
            fclose($header_src);
        }
        if (file_exists('../footer.md')) {
            $footer_src = fopen('../footer.md', 'r');
            $footer = markdown_to_html($footer_src);
            fclose($footer_src);
        }
    }

    $title = get_title($header, $body);

    ob_start();
    include "../theme/layout.php";
    $output = ob_get_clean();
    return $output;

}

/*
*   If the inputted file is a .md file, then it renders it and then saves the render to dist
*   otherwise it just copies the input file to dist into the correct location
*/
function save_dist($relative_src_path) {
    $ext = pathinfo($relative_src_path, PATHINFO_EXTENSION);
    if ($ext == "md") {
        $_md_src = fopen(SRC_DIR . $relative_src_path, "r") or die("File not found: " . $relative_src_path);
        $output = render_func($relative_src_path, $ext, $_md_src);
        $output_dest_path = DIST_DIR . preg_replace('"\.md$"', '.html', $relative_src_path);
    }
    else {
        $output_dest_path =  DIST_DIR . $relative_src_path;
    }
    $directoryPath = dirname($output_dest_path);
    // check if the directory exists that will contain the rendered html file
    if (!is_dir($directoryPath)) {
        mkdir($directoryPath, 0755, true);
    }
    // if its a markdown source file, then copy the actual html over there
    if ($ext == "md") {
        file_put_contents($output_dest_path, $output);
    }
    // otherwise just create a symlink back to the source file (in order to save space)
    else {
        $targetPath = $output_dest_path;
        $absoluteSrcPath = SRC_DIR . $relative_src_path;
        @symlink($absoluteSrcPath, $targetPath);
    }
}

function save_all_to_dist($dir) {
    // RecursiveDirectoryIterator to iterate through the directory
    $iterator = new RecursiveIteratorIterator(
        new RecursiveCallbackFilterIterator(
            new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS),
            function ($current, $key, $iterator) {
                // Skip directories named "theme", or "cms" or "dist"
                $skipDirs = ['theme', 'cms', 'dist'];
                if ($current->isDir() && in_array($current->getBasename(), $skipDirs)) {
                    return false;  // Skip this directory
                }
                return true;  // Otherwise, include this file/directory
            }
        ),
        RecursiveIteratorIterator::LEAVES_ONLY // Only return files, not directories
    );
    foreach ($iterator as $file) {

        // process only regular files (not directories)
        if ($file->isFile()) {
            $absolutePath = $file->getRealPath();
            $relativePath = "/" . str_replace(SRC_DIR . DIRECTORY_SEPARATOR, '', $absolutePath);
            save_dist($relativePath); // save_dist on the file
        }
    }
}
