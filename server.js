const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Middleware - Serve static files from ALL directories
app.use(express.json());
app.use(express.static(__dirname));
app.use('/Scripts', express.static(path.join(__dirname, 'Scripts')));
app.use('/Pages', express.static(path.join(__dirname, 'Pages')));
app.use('/Images', express.static(path.join(__dirname, 'Images')));

// API endpoint to save user data
app.post('/save-user', (req, res) => {
    const userData = req.body;
    const filePath = path.join(__dirname, 'Scripts', 'userinfo.json');
    
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    
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
    console.log(`Access your app at:`);
    console.log(`   Home: http://localhost:${port}/`);
    console.log(`   Settings: http://localhost:${port}/settings`);
    console.log(`   Graph 1: http://localhost:${port}/graph1`);
    console.log(`   Graph 2: http://localhost:${port}/graph2`);
});