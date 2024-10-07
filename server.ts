import express from 'express';
import path from 'path';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import fs from 'fs';

// Initialize environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Serve static files (e.g., CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Body parser to parse form data
app.use(bodyParser.urlencoded({ extended: true }));

// Serve the form page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/form.html'));
});

// Handle form submission
app.post('/start-bot', (req, res) => {
    const username = req.body.username;
    const sanitizedUsername = username.split('@')[0]; // Sanitize the username for the log file

    // Create user-specific data structure
    const userData = {
        linkedinUsername: username,
        linkedinPassword: req.body.password,
        noOfRandomPosts: req.body.randomPosts,
        noOfCompanyPosts: req.body.companyPosts,
        companies: req.body.companies.split(',').map((company: string) => company.trim().replace(/"/g, ''))
    };

    // Save user data to a JSON file, named after the sanitized username
    fs.writeFileSync(`./data/${sanitizedUsername}-data.json`, JSON.stringify(userData, null, 2));

    // Trigger the bot script with the user-specific data file
    exec(`ts-node index.ts ${sanitizedUsername} > logs/${sanitizedUsername}-logs.log 2>&1`, (err, stdout, stderr) => {
        if (err) {
            console.error(`Error executing script: ${stderr}`);
            res.status(500).send('Error starting the bot');
            return;
        }
        console.log(stdout);
        res.send(`Bot started successfully! Logs will be saved in ${sanitizedUsername}-logs.log`);
    });
});

// Start the Express server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
