const fs = require('fs');
const https = require('https');

// Google Sheet ID from index.html
const GOOGLE_SHEET_ID = '1UncTyXNeqed_WMVp1Im9_DwInUuqnKJ4jXyYmxQVEvo';

// Helper function to check if a value is a URL
function isUrl(value) {
    if (!value || typeof value !== 'string') return false;
    const trimmed = value.trim();
    return /^https?:\/\//i.test(trimmed);
}

// Helper function to check if a value is an image URL
function isImageUrl(value) {
    if (!isUrl(value)) return false;
    return /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?.*)?$/i.test(value);
}

// Helper function to convert title to filename
function titleToFilename(title) {
    return title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

// Simple CSV parser
function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return { headers: [], data: [] };
    
    const parseLine = (line) => {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    };
    
    // Skip row 0, use row 1 as headers
    const rawHeaders = parseLine(lines[1]);
    const headers = rawHeaders.map((header, index) => ({
        original: header,
        index: index
    }));
    
    // Parse data rows starting from row 2 (skip row 0 and row 1)
    const data = lines.slice(2).map(line => {
        const values = parseLine(line);
        return values;
    });
    
    return { headers, data };
}

// Fetch CSV from Google Sheets
function fetchCSV(sheetId) {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
    
    return new Promise((resolve, reject) => {
        const makeRequest = (url) => {
            https.get(url, (res) => {
                // Handle redirects
                if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
                    const redirectUrl = res.headers.location;
                    if (redirectUrl) {
                        return makeRequest(redirectUrl);
                    }
                }
                
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        resolve(data);
                    } else {
                        reject(new Error(`HTTP error! status: ${res.statusCode}`));
                    }
                });
            }).on('error', (err) => {
                reject(err);
            });
        };
        
        makeRequest(csvUrl);
    });
}

// Generate markdown file
function generateMarkdownFile(title, filename) {
    const content = `# ${title}\n`;
    const projectsDir = 'projects/md';
    
    // Create projects/md directory if it doesn't exist
    if (!fs.existsSync(projectsDir)) {
        fs.mkdirSync(projectsDir, { recursive: true });
    }
    
    const filepath = `${projectsDir}/${filename}.md`;
    
    fs.writeFileSync(filepath, content, 'utf8');
    console.log(`Created: ${filepath}`);
}

// Generate HTML file
function generateHtmlFile(title, filename) {
    const mdPath = `md/${filename}.md`;
    const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link rel="stylesheet" href="../css/style.css">
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <style>
        .markdown-content {
            max-width: 800px;
            margin: 0 auto;
            padding: 2em;
            text-align: left;
        }
        .markdown-content h1,
        .markdown-content h2,
        .markdown-content h3,
        .markdown-content h4,
        .markdown-content h5,
        .markdown-content h6 {
            margin-top: 1em;
            margin-bottom: 0.5em;
        }
        .markdown-content p {
            margin-bottom: 1em;
        }
        .markdown-content hr {
            border: none;
            border-top: 1px solid #000;
            margin: 2em 0;
        }
    </style>
</head>
<body>
    <div class="markdown-content" id="markdownContent">
        Loading...
    </div>

    <script>
        // Fetch and render the markdown file
        fetch('${mdPath}')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load markdown file');
                }
                return response.text();
            })
            .then(markdown => {
                // Convert markdown to HTML using marked.js
                const html = marked.parse(markdown);
                document.getElementById('markdownContent').innerHTML = html;
            })
            .catch(error => {
                console.error('Error loading markdown:', error);
                document.getElementById('markdownContent').innerHTML = 
                    '<p>Error loading project text. Please check the console for details.</p>';
            });
    </script>
</body>
</html>`;
    
    const projectsDir = 'projects';
    
    // Create projects directory if it doesn't exist
    if (!fs.existsSync(projectsDir)) {
        fs.mkdirSync(projectsDir, { recursive: true });
    }
    
    const filepath = `${projectsDir}/${filename}.html`;
    
    fs.writeFileSync(filepath, htmlTemplate, 'utf8');
    console.log(`Created: ${filepath}`);
}

// Main function
async function main() {
    try {
        console.log('Fetching data from Google Sheets...');
        const csvText = await fetchCSV(GOOGLE_SHEET_ID);
        
        console.log('Parsing CSV...');
        const { headers, data } = parseCSV(csvText);
        
        if (headers.length < 2) {
            console.error('Not enough columns in the sheet');
            return;
        }
        
        // Column 2 is at index 1
        const column2Index = 1;

        
        // !!!!!!!!!!!!!!!!!!!!!!!!!!
        // Get first 3 text values from column 2 (skip URLs and images)
        const textValues = [];
        for (let i = 0; i < data.length && textValues.length < 3; i++) {
            const cellValue = data[i][column2Index] || '';
            const trimmed = cellValue.trim();
            
            // Skip empty values, URLs, and images
            if (trimmed && !isUrl(trimmed) && !isImageUrl(trimmed)) {
                textValues.push(trimmed);
            }
        }
        
        if (textValues.length === 0) {
            console.error('No text values found in column 2');
            return;
        }
        
        console.log(`Found ${textValues.length} text values in column 2:`);
        textValues.forEach((val, idx) => {
            console.log(`  ${idx + 1}. ${val}`);
        });
        
        // Generate markdown and HTML files
        console.log('\nGenerating markdown and HTML files...');
        textValues.forEach((title) => {
            const filename = titleToFilename(title);
            generateMarkdownFile(title, filename);
            generateHtmlFile(title, filename);
        });
        
        console.log('\nDone!');
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

main();
