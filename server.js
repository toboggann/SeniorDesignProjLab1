const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 3000;

// In-memory storage for user data
let userDataStorage = {};

app.use(express.json());


// Add this route to your server.js - place it with your other API endpoints

// API endpoint to update unit in power.json
app.post('/update-power-json', (req, res) => {
    try {
        const unitData = req.body;
        const filePath = path.join(__dirname, 'Scripts', 'power.json');
        
        // Read existing power.json data
        let existingData = {};
        if (fs.existsSync(filePath)) {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            if (fileContent.trim()) {
                existingData = JSON.parse(fileContent);
            }
        }
        
        // Merge the new unit data with existing data
        const updatedData = { 
            ...existingData, 
            ...unitData 
        };
        
        // Write the updated data back to the file
        fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2));
        console.log('Unit updated successfully in power.json:', unitData);
        
        res.json({ 
            success: true, 
            message: 'Unit updated successfully',
            updatedData: unitData
        });
    } catch (error) {
        console.error('Error updating unit:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to update unit',
            details: error.message 
        });
    }
});

// API endpoint to save user data
app.post('/save-user', (req, res) => {
    try {
        const userData = req.body;
        userDataStorage = userData;
        
        console.log('User data saved to memory:', userData);
        res.json({ 
            message: 'Settings saved successfully',
            note: 'Data is stored in server memory'
        });
    } catch (error) {
        console.error('Error saving user data:', error);
        res.status(500).json({ error: 'Failed to save settings' });
    }
});

// New endpoint to retrieve saved user data
app.get('/get-user', (req, res) => {
    try {
        res.json(userDataStorage);
    } catch (error) {
        console.error('Error retrieving user data:', error);
        res.status(500).json({ error: 'Failed to retrieve settings' });
    }
});

// static file serving
app.use(express.static(__dirname));
app.use('/Scripts', express.static(path.join(__dirname, 'Scripts')));
app.use('/Pages', express.static(path.join(__dirname, 'Pages')));
app.use('/Images', express.static(path.join(__dirname, 'Images')));

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

// 404 handler for undefined API routes
app.use('/update-power', (req, res) => {
    res.status(404).json({ error: 'update-power route not found - check server setup' });
});

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`Access your app at: http://localhost:${port}/`);
    console.log('');
    console.log('Server started successfully!');
});