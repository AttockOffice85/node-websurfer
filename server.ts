import express from 'express';
import path from 'path';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { exec } from 'child_process';

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
    // Update environment variables based on form data
    if (req.body.username && req.body.password) {
        process.env.LINKEDIN_USERNAME = req.body.username;
        process.env.LINKEDIN_PASSWORD = req.body.password;
        process.env.NO_OF_RANDOM_POSTS = req.body.randomPosts;
        process.env.NO_OF_COMPANY_POSTS = req.body.companyPosts;

        // Parse companies list from textarea input
        const companies = req.body.companies.split(',').map((company: string) => company.trim().replace(/"/g, ''));

        // Store the companies in the JSON data file
        const fs = require('fs');
        const mainData = { companies: companies.map((name: string) => ({ name })) };
        fs.writeFileSync('./data/main-data.json', JSON.stringify(mainData, null, 2));

        // Trigger the bot script
        exec(`ts-node index.ts > ${req.body.username.split('@')[0]}-logs.log 2>&1`, (err, stdout, stderr) => {
            if (err) {
                console.error(`Error executing script: ${stderr}`);
                res.status(500).send('Error starting the bot');
                return;
            }
            console.log(stdout);
            res.send(`Bot successfully completed the operations! Check the ${req.body.username.split('@')[0]}-logs.log for more details.`);
        });
    } else {
        res.status(400).send('Missing LinkedIn credentials');
    }
});

// Start the Express server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
