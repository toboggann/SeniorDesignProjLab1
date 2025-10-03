const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Middleware - Serve static files from ALL directories
app.use(express.json());
app.use(express.static(__dirname));
app.use('/Scripts', express.static(path.join(__dirname, 'Scripts')));
app.use('/Pages', express.static(path.join(__dirname, 'Pages')));
app.use('/Images', express.static(path.join(__dirname, 'Images')));

// In-memory storage for user data (replaces file writing)
let userDataStorage = {};

// API endpoint to save user data
app.post('/save-user', (req, res) => {
    try {
        const userData = req.body;
        
        // Store data in memory instead of writing to file
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
        //console.log('Retrieving user data:', userDataStorage);
        res.json(userDataStorage);
    } catch (error) {
        console.error('Error retrieving user data:', error);
        res.status(500).json({ error: 'Failed to retrieve settings' });
    }
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