const express = require('express');
const { google } = require('googleapis');
const bodyParser = require('body-parser');
const cors = require('cors');
const PDFDocument = require('pdfkit');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 4000;

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
});

const SHEET_ID = process.env.SHEET_ID;

app.get('/api/listings', async (req, res) => {
  try {
    const sheets = google.sheets({ version: 'v4', auth });
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Listings!A2:L'
    });

    const rows = result.data.values || [];
    const listings = rows.map((row, index) => ({
      id: `deal-${index + 1}`,
      date: row[0],
      title: row[1],
      revenue: row[2],
      profit: row[3],
      askingPrice: row[4],
      industry: row[5],
      monetizationModel: row[6],
      description: row[7],
      url: row[8],
      opportunityScore: row[9],
      riskScore: row[10],
      pros: row[11],
      cons: row[12]
    }));

    res.json(listings);
  } catch (error) {
    console.error('Error fetching listings:', error);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

app.get('/api/report/:dealId', async (req, res) => {
  try {
    const dealId = req.params.dealId;
    const sheets = google.sheets({ version: 'v4', auth });
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Listings!A2:L'
    });

    const rows = result.data.values || [];
    const dealIndex = parseInt(dealId.split('-')[1], 10) - 1;
    const deal = rows[dealIndex];

    if (!deal) return res.status(404).send('Deal not found');

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${dealId}_report.pdf`);

    doc.fontSize(18).text(`Sniper Report - ${deal[1]}`, { underline: true });
    doc.moveDown();

    const labels = [
      'Date', 'Title', 'Revenue', 'Profit', 'Asking Price', 'Industry',
      'Monetization Model', 'Description', 'URL', 'Opportunity Score', 'Risk Score', 'Pros', 'Cons'
    ];

    labels.forEach((label, i) => {
      doc.fontSize(12).text(`${label}: ${deal[i] || ''}`);
    });

    doc.end();
    doc.pipe(res);
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).send('Failed to generate report');
  }
});

app.get('/', (req, res) => {
  res.send('Sniper Backend is working!');
});

app.listen(PORT, () => console.log(`Sniper backend running on port ${PORT}`));
