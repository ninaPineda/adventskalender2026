const SHEET_NAME = 'Sheet1';

function doGet(e) {
  const callback = e.parameter.callback || 'callback';
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const values = sheet.getDataRange().getValues();
  const headers = values.shift().map(normalizeHeader);

  const rows = values
    .filter(row => row.some(cell => cell !== ''))
    .map(row => {
      const item = {
        timestamp: row[0] || '',
        name: row[1] || 'Anonym',
        solved: row[2] || '',
        points: row[3] || 0,
      };

      headers.forEach((header, index) => {
        if (header) item[header] = row[index];
      });

      item.timestamp = item.timestamp || row[0] || '';
      item.name = item.name || row[1] || 'Anonym';
      item.solved = item.solved || item.day || row[2] || '';
      item.points = item.points || item.pts || item.punkte || row[3] || 0;

      return item;
    });

  return ContentService
    .createTextOutput(`${callback}(${JSON.stringify(rows)})`)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(normalizeHeader);
  const activeHeaders = headers.length ? headers : ['timestamp', 'name', 'solved', 'points'];
  const row = activeHeaders.map((header, index) => {
    if (header === 'timestamp') return e.parameter.timestamp || new Date().toISOString();
    if (header === 'name') return e.parameter.name || 'Anonym';
    if (header === 'solved') return e.parameter.solved || e.parameter.day || '';
    if (header === 'day') return e.parameter.day || e.parameter.solved || '';
    if (header === 'points') return e.parameter.points || '0';
    if (!header && index === 0) return e.parameter.timestamp || new Date().toISOString();
    if (!header && index === 1) return e.parameter.name || 'Anonym';
    if (!header && index === 2) return e.parameter.solved || e.parameter.day || '';
    if (!header && index === 3) return e.parameter.points || '0';
    return e.parameter[header] || '';
  });

  sheet.appendRow(row);
  return ContentService.createTextOutput('ok');
}

function normalizeHeader(header) {
  return String(header).trim().toLowerCase();
}
