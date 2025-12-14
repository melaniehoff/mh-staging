# Lichen-Markdown

Lichen-Markdown is a simple and friendly CMS for making static websites. Lichen-markdown is a fork of the [original php version of Lichen](https://codeberg.org/stringbone/lichen/src/branch/master).

There is a simple web page with more info about the project at [https://lichen.commoninternet.net](https://lichen.commoninternet.net).

![screenshot of lichen UI](https://codeberg.org/notplants/lichen-markdown-landing-page/raw/branch/main/screenshots/lichen-markdown-cms-boxshadow4.png)

## Running Locally

First, download the latest release of Lichen-Markdown to your local development environment:

```
wget https://codeberg.org/ukrudt.net/lichen-markdown/archive/v1.2.0.zip
unzip v1.2.0.zip
```

You can then run it directly with php:
```
cd lichen-markdown/src; 
php -S 127.0.0.1:8000 cms/router.php
```

You can then navigate to `127.0.0.1:8000` to see the website.

Navigate to `127.0.0.1:8000/cms/edit.php` to see the admin interface.


## Running On A Server 

On a server, first download the latest release of Lichen-Markdown to your server in the same way as above. 

This folder can then be served via Apache, Nginx or Docker (using Apache inside).

Instructions for each of these methods are below.


### Apache Setup

With an apache web server, use the .htaccess in the src directory of this repository (note that this htaccess file includes settings for .gmi and .md files), and make sure that this folder is in a directory served by Apache.

### Nginx Setup

With an nginx web server, copy the nginx config in this repository in docs/nginx.conf to /etc/nginx/sites-enabled.

In nginx.conf you need to replace "root" with the path to your lichen-markdown project, server_name with your actual server name.

There is a also a comment within nginx.conf explaining how to protect the admin panel with http basic auth, if you choose to.

### Docker Setup

The Dockerfile in docker/Dockerfile builds a docker image which can be used to serve Lichen-Markdown with apache, via something like this:

```bash
docker build -t lichen-markdown:latest ./docker/
docker run -d -p 8000:80 -v $(pwd)/src:/var/www/html lichen-markdown:latest
```

## Usage

![screenshot of lichen UI](https://codeberg.org/notplants/lichen-markdown-landing-page/raw/branch/main/screenshots/editor-screenshot-boxshadow4.png)

Navigate to `/cms/edit.php` to edit pages or add new ones. Changes you make to the raw Markdown on the left are reflected in the live preview on the right.

Open the cheatsheet.md file in the editor to see how markdown can be used to format your web pages.

Click the green "Save" button at the bottom to save your content and render a fresh HTML file.

![screenshot of lichen UI](https://codeberg.org/notplants/lichen-markdown-landing-page/raw/branch/main/screenshots/file-nav-boxshadow4.png)

The file manager allows you to create new pages and folders, and upload files like images and videos.

Click on a Markdown file (.md) to edit it.

You can also edit the typographic styling of the page: Expand the `assets` folder and click on the `stylesheet.css` file. Changes in this file will be reflected in the live preview.

Hover a file and click the 🔗 button to return to the editor and insert a link to that file. It will be inserted at the current cursor position.

### Set the title of the page

Web pages has a `title` that will be reflected in the browser or tab-header. In Lichen-markdown you can set the title explicitly. If not set the title will fall back to the most prominent headline.

To set a title explicity, use the following format in the markdown-file:

```
<!-- TITLE: A Wonderful Title -->
```

Then `A Wonderful Title` will become the title for that web page.

To set a general title for all pages in your web site, add the title-snippet to the `header.md` file. If you additionally add another title-snippet to a specific page, then the specific page title will override the one in the header-file, for that page.

## Project Structure

The "src" folder of the downloaded folder contains an example Lichen-Markdown project with everything needed, including the markdown files for each web page, the cms folder (which contains the php files of the cms), and the theme folder, which contains a layout.php file used for rendering all the markdown pages.

"src/dist" is a folder that is built from the contents of src. The reason dist is inside of src is an oddity to make the nginx configuration work better. 

From the command line, dist can be rebuilt via the command: `php cms/build.php`.

Dist can also be re-built through the web interface by clicking the "Rebuild" button which becomes visible when hovering over "src" in the editor. 

Rebuilding "dist" manually like this is actually only necessary if you change files on disc, outside of the Lichen admin UI &mdash; otherwise Lichen will keep src and dist in sync, with dist containing the render HTML versions of files in src. 

## Using Lichen-Markdown As An SSG

The first intended usecase of Lichen-Markdown is to be run as a webserver, so that it can be used as a CMS by an individual or between a small group of collaborators.

However it is also possible to use Lichen-Markdown as a sort of static site generator directly, by uploading the contents of "dist" to somewhere else. 

"dist" contains a static artifact of the website and rendered HTML. This is more of a custom use-case, but noting this here in case anyone wants to use it like that. Note that for files that are not renders of .md files, dist actually is made up of symbolic links back to the original files (in order to save space, and not have each file duplicated). So if you are copying 'dist' to another server, for example using rsync, you would want to use a command that copies symbolic links as real files, such as `rsync -avL source/ destination/`.

You can also rebuild dist on the command line via the command: `php cms/build.php`.


## Running With Docker

If you want to locally test lichen-markdown in combination with apache, you can use Docker.

A script with the docker command is included: 

```bash
bash run-dev.sh
```

Then go to [localhost:8000](http://localhost:6969) to use the app.

### Debugging rendering

You can debug rendered html in php with this trick, where `$variable` is a variable containing an html string.

```php
echo ("<pre><code>" . json_encode($variable) . "</code></pre>");
```

## Contributors

Lichen-Markdown was forked from Lichen, by [@abekonge](https://sunbeam.city/@abekonge), [@soapdog](https://toot.cafe/@soapdog), and [@notplants](https://sunbeam.city/@notplants).

## License

The original Lichen and this fork are both licensed using MIT License.

```
The MIT License (MIT)

Copyright © 2022 Sensor Station LLC

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```
