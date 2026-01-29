const XLSX = require('xlsx');

/**
 * Generate Excel template for a module
 * @param {Array} headers - Array of header objects { key, label, required, type }
 * @param {Array} sampleData - Optional sample data rows
 * @returns {Buffer} Excel file buffer
 */
function generateTemplate(headers, sampleData = []) {
  // Create workbook
  const workbook = XLSX.utils.book_new();

  // Prepare header row
  const headerRow = headers.map(h => h.label || h.key);

  // Prepare data rows
  const dataRows = [];
  
  // Add sample data if provided
  if (sampleData.length > 0) {
    sampleData.forEach(sample => {
      const row = headers.map(h => sample[h.key] || '');
      dataRows.push(row);
    });
  }

  // Combine header and data
  const worksheetData = [headerRow, ...dataRows];

  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Set column widths
  const colWidths = headers.map(() => ({ wch: 20 }));
  worksheet['!cols'] = colWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

  // Generate buffer
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return buffer;
}

/**
 * Export data to Excel
 * @param {Array} data - Data array
 * @param {Array} headers - Header definitions
 * @returns {Buffer} Excel file buffer
 */
function exportToExcel(data, headers) {
  const workbook = XLSX.utils.book_new();
  
  // Prepare header row
  const headerRow = headers.map(h => h.label || h.key);
  
  // Prepare data rows
  const dataRows = data.map(item => {
    return headers.map(h => {
      const value = item[h.key];
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value);
      return value.toString();
    });
  });
  
  // Combine header and data
  const worksheetData = [headerRow, ...dataRows];
  
  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  
  // Set column widths
  const colWidths = headers.map(() => ({ wch: 20 }));
  worksheet['!cols'] = colWidths;
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  
  // Generate buffer
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return buffer;
}

module.exports = { generateTemplate, exportToExcel };

