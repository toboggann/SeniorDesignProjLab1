const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(__dirname)); // Serve all static files from root

// API endpoint to save user data
app.post('/save-user', (req, res) => {
    const userData = req.body;
    const filePath = path.join(__dirname, 'Scripts', 'userinfo.json');
    
    fs.writeFile(filePath, JSON.stringify(userData, null, 2), (err) => {
        if (err) {
            console.error('Error saving file:', err);
            res.status(500).json({ error: 'Failed to save file' });
        } else {
            console.log('File saved successfully to', filePath);
            res.json({ message: 'File saved successfully' });
        }
    });
});

// Route handlers for your HTML pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'home.html'));
});

app.get('/settings', (req, res) => {
    res.sendFile(path.join(__dirname, 'Pages', 'settings.html'));
});

app.get('/graph1', (req, res) => {
    res.sendFile(path.join(__dirname, 'Pages', 'graph1.html'));
});

app.get('/graph2', (req, res) => {
    res.sendFile(path.join(__dirname, 'Pages', 'graph2.html'));
});

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`Access your app at: http://localhost:${port}/`);
});