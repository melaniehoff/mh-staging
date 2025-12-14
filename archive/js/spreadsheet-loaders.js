
// Helper function to create a safe key from a column name
function createSafeKey(name) {
    return name.trim().replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_$&') || 'column';
}

// Helper function to check if a value is a Dropbox URL
function isDropboxUrl(value) {
    if (!value || typeof value !== 'string') return false;
    const trimmed = value.trim();
    if (!trimmed) return false;
    // Check if it's a Dropbox URL
    return /^https?:\/\/(www\.)?dropbox\.com\//i.test(trimmed);
}

// Helper function to convert Dropbox URL from &dl=0 to &raw=1
function convertDropboxUrl(url) {
    if (!isDropboxUrl(url)) return url;
    
    let converted = url;
    
    // Replace &dl=0 with &raw=1 (works whether it's at the end or in the middle)
    converted = converted.replace(/&dl=0/gi, '&raw=1');
    
    // Replace ?dl=0 with ?raw=1 (when dl=0 is the first query parameter)
    converted = converted.replace(/\?dl=0/gi, '?raw=1');
    
    return converted;
}

// Helper function to check if a value is an image URL
function isImageUrl(value) {
    if (!value || typeof value !== 'string') return false;
    const trimmed = value.trim();
    if (!trimmed) return false;
    // Check if it starts with http:// or https://
    if (!trimmed.match(/^https?:\/\//i)) return false;
    // Check if it ends with common image extensions
    return /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?.*)?$/i.test(trimmed);
}

function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return { headers: [], data: [] }; // Need at least 2 rows (skip row 0, use row 1 as header)
    
    // Simple CSV parser - handles quoted fields
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
    const headers = rawHeaders.map((header, index) => {
        const safeKey = createSafeKey(header) + (index > 0 ? '_' + index : '');
        return { original: header, key: safeKey };
    });
    
    // Parse data rows starting from row 2 (skip row 0 and row 1)
    const data = lines.slice(2).map(line => {
        const values = parseLine(line);
        const obj = {};
        headers.forEach((headerInfo, i) => {
            obj[headerInfo.key] = values[i] || '';
        });
        return obj;
    });
    
    return { headers, data };
}

function loadFromCSV(csvUrl, tableId) {
    fetch(csvUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(csvText => {
            const { headers, data } = parseCSV(csvText);
            
            if (headers.length === 0) {
                console.error('No headers found in CSV');
                return;
            }
            
            // Limit to first 5 columns only
            const first5Headers = headers.slice(0, 4);
            
            // Filter to only include the first 5 columns (row 0 already skipped in parseCSV)
            // Also convert Dropbox URLs from &dl=0 to &raw=1
            const filteredData = data.map(row => {
                const filteredRow = {};
                first5Headers.forEach(headerInfo => {
                    let cellValue = row[headerInfo.key] || '';
                    // Convert Dropbox URLs if the cell contains only a Dropbox URL
                    if (cellValue && isDropboxUrl(cellValue)) {
                        cellValue = convertDropboxUrl(cellValue);
                    }
                    filteredRow[headerInfo.key] = cellValue;
                });
                return filteredRow;
            });
            
            // Helper function to render cell content (image or text)
            function renderCell(data, type, row, meta) {
                // Column 2 (index 1) should be a link
                const columnIndex = meta.col;
                const isColumn2 = columnIndex === 1;
                
                if (type === 'display' && isImageUrl(data)) {
                    const isColumn1 = columnIndex === 0;
                    const imgClass = isColumn1 ? 'column1-img' : '';
                    return `<img src="${data}" alt="Image" class="${imgClass}" style="max-width: 150px; max-height: 150px; object-fit: contain;" onerror="this.style.display='none';" />`;
                }
                
                // Make column 2 a link
                if (isColumn2 && type === 'display' && data) {
                    // Use the data as both href and text
                    const href = data.trim();
                    return `<a href="${href}" class="column2-link">${data}</a>`;
                }
                
                return data;
            }
            
            // Helper function to render header content (image or text)
            function renderHeader(headerValue, columnIndex) {
                // Convert Dropbox URLs in headers too
                let convertedValue = headerValue;
                if (isDropboxUrl(headerValue)) {
                    convertedValue = convertDropboxUrl(headerValue);
                }
                if (isImageUrl(convertedValue)) {
                    const isColumn1 = columnIndex === 0;
                    const imgClass = isColumn1 ? 'column1-img' : '';
                    return `<img src="${convertedValue}" alt="Image" class="${imgClass}" style="max-width: 150px; max-height: 150px; object-fit: contain;" onerror="this.style.display='none';" />`;
                }
                
                // Make column 2 (index 1) a link
                const isColumn2 = columnIndex === 1;
                if (isColumn2 && convertedValue) {
                    const href = convertedValue.trim();
                    return `<a href="${href}" class="column2-link">${convertedValue}</a>`;
                }
                
                return convertedValue;
            }
            
            // Initialize DataTable with safe keys (only first 5 columns, row 0 skipped)
            const $table = $(tableId);
            const dataTable = $table.DataTable({
                data: filteredData,
                columns: first5Headers.map(h => ({ 
                    data: h.key,
                    title: h.original,
                    render: renderCell,
                    orderable: false
                })),
                paging: false,
                searching: false,
                info: false,
                ordering: false,
                destroy: true,
                drawCallback: function() {
                    // Update headers after each draw to render images
                    const $thead = $table.find('thead th');
                    $thead.each(function(index) {
                        if (index < first5Headers.length) {
                            const headerValue = first5Headers[index].original;
                            $(this).html(renderHeader(headerValue, index));
                        }
                    });
                }
            });
            
            // Also update headers immediately after initialization
            setTimeout(function() {
                const $thead = $table.find('thead th');
                $thead.each(function(index) {
                    if (index < first5Headers.length) {
                        const headerValue = first5Headers[index].original;
                        $(this).html(renderHeader(headerValue, index));
                    }
                });
            }, 0);
        })
        .catch(error => {
            console.error('Error loading CSV:', error);
            const $table = $(tableId);
            $table.find('tbody').html('<tr><td colspan="100%">Error loading data. Please check the console for details.</td></tr>');
        });
}

function loadFromGoogleSheets(sheetId, tableId, gid = null, sheetName = null) {
    // Clean up sheet ID - remove any "d/" prefix if present
    let cleanSheetId = sheetId.trim();
    if (cleanSheetId.startsWith('d/')) {
        cleanSheetId = cleanSheetId.substring(2);
    }
    // Remove any trailing slashes or extra path
    cleanSheetId = cleanSheetId.split('/')[0].split('?')[0];
    
    // Build the CSV export URL
    let csvUrl;
    
    if (gid) {
        // Use GID for specific sheet tab
        csvUrl = `https://docs.google.com/spreadsheets/d/${cleanSheetId}/export?format=csv&gid=${gid}`;
    } else if (sheetName) {
        // Use sheet name
        csvUrl = `https://docs.google.com/spreadsheets/d/${cleanSheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
    } else {
        // Use first sheet (default)
        csvUrl = `https://docs.google.com/spreadsheets/d/${cleanSheetId}/export?format=csv`;
    }
    
    console.log('Loading from Google Sheets:', csvUrl);
    
    // Use the existing CSV loader
    loadFromCSV(csvUrl, tableId);
}

// Helper function to extract Sheet ID from a Google Sheets URL
function extractSheetIdFromUrl(url) {
    // Handles various Google Sheets URL formats
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
}
