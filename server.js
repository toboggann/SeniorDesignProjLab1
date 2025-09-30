const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('.'));

// API endpoint to save user data
app.post('/save-user', (req, res) => {
    const userData = req.body;
    const filePath = path.join(__dirname, './Scripts/userinfo.json');
    
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

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/Pages/settings.html`);
    console.log(`JSON file will be saved to: ${path.join(__dirname, './Scripts/userinfo.json')}`);
});