
// routes/authRoutes.js
import express from 'express';

import mongoose from 'mongoose';
import crypto from 'crypto';

import multer from 'multer';
import fs from 'fs';
import csv from 'csv-parser';

import AIEmailGenerator from '../controllers/ai-email-generator.js';

import * as authController from '../controllers/authController.js';
import * as authMiddleware from '../middleware/authMiddleware.js';

import ABTest from '../models/ABTest.js';

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);

router.get('/protected', authMiddleware.protect, (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'You have access to this protected route',
        user: req.user,
    });
});

// Email Schema
const emailSchema = new mongoose.Schema({
    recipient: String,
    subject: String,
    content: String,
    trackingId: { type: String, unique: true },
    sentAt: { type: Date, default: Date.now },
    opens: [{ type: Date }]
});

emailSchema.index({ trackingId: 1 });
emailSchema.index({ recipient: 1 });

const Email = mongoose.model('Email', emailSchema);

// Generate tracking ID
function generateTrackingId() {
    return crypto.randomBytes(16).toString('hex');
}

// Create and save email
router.post('/send', async (req, res) => {
    try {
        const { recipient, subject, content } = req.body;
        const trackingId = generateTrackingId();
        const email = new Email({
            recipient,
            subject,
            content,
            trackingId
        });
        await email.save();
        res.json({ trackingId, message: 'Email sent and tracked' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to send email' });
    }
});

// Handle pixel request
router.get('/pixel/:trackingId', async (req, res) => {
    try {
        const { trackingId } = req.params;
        await Email.findOneAndUpdate(
            { trackingId },
            { $push: { opens: new Date() } }
        );

        // Send a 1x1 transparent GIF
        const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
        res.writeHead(200, {
            'Content-Type': 'image/gif',
            'Content-Length': pixel.length
        });
        res.end(pixel);
    } catch (error) {
        console.error('Failed to log email open:', error);
        res.status(500).end();
    }
});

// Get email stats
router.get('/stats', async (req, res) => {
    try {
        const totalEmails = await Email.countDocuments();
        const openedEmails = await Email.countDocuments({ 'opens.0': { $exists: true } });
        const openRate = totalEmails > 0 ? (openedEmails / totalEmails) * 100 : 0;

        res.json({
            totalEmails,
            openedEmails,
            openRate: openRate.toFixed(2) + '%'
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch email stats' });
    }
});

// Get stats for a specific email
router.get('/stats/:trackingId', async (req, res) => {
    try {
        const { trackingId } = req.params;
        const email = await Email.findOne({ trackingId });
        if (!email) {
            return res.status(404).json({ error: 'Email not found' });
        }
        res.json({
            recipient: email.recipient,
            subject: email.subject,
            sentAt: email.sentAt,
            openCount: email.opens.length,
            lastOpenedAt: email.opens.length > 0 ? email.opens[email.opens.length - 1] : null
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch email stats' });
    }
});


// Bulk Email Personalization


const upload = multer({ dest: 'uploads/' });
const emailGenerator = new AIEmailGenerator();

router.post('/upload-csv', upload.single('file'), (req, res) => {
    const results = [];
    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
            fs.unlinkSync(req.file.path); // Delete the uploaded file
            const columns = Object.keys(results[0]);
            res.json({ columns });
        });
});

router.post('/preview-bulk', async (req, res) => {
    const { mapping } = req.body;
    const previewEmails = [];

    // Generate preview for 3 sample emails
    for (let i = 0; i < 3; i++) {
        const emailParams = {
            recipientName: `Sample Recipient ${i + 1}`,
            company: `Sample Company ${i + 1}`,
            purpose: 'showcase our product',
            additionalInfo: 'This is a sample email for preview purposes.'
        };

        const emailContent = await emailGenerator.generateEmail(emailParams);
        previewEmails.push({
            recipient: emailParams.recipientName,
            subject: `Email from ${emailParams.company}`,
            content: `${emailContent.greeting}\n\n${emailContent.body}\n\n${emailContent.signature}`
        });
    }

    res.json({ previewEmails });
});

router.post('/generate-bulk', async (req, res) => {
    const { mapping } = req.body;

    // In a real application, you would read the CSV file again here
    // and generate emails for each row using the mapping

    // For demonstration purposes, we'll generate 10 sample emails
    const generatedEmails = [];

    for (let i = 0; i < 10; i++) {
        const emailParams = {
            recipientName: `Recipient ${i + 1}`,
            company: `Company ${i + 1}`,
            purpose: 'introduce our new product',
            additionalInfo: 'We believe our product can greatly benefit your company.'
        };

        const emailContent = await emailGenerator.generateEmail(emailParams);
        const email = new Email({
            recipient: emailParams.recipientName,
            subject: `Email from ${emailParams.company}`,
            content: `${emailContent.greeting}\n\n${emailContent.body}\n\n${emailContent.signature}`,
            trackingId: generateTrackingId()
        });

        await email.save();
        generatedEmails.push(email);
    }

    res.json({ message: 'Bulk emails generated successfully', count: generatedEmails.length });
});

router.get('/recent', async (req, res) => {
    try {
        const recentEmails = await Email.find()
            .sort({ sentAt: -1 })
            .limit(10)
            .select('recipient subject sentAt opens');
        res.json(recentEmails);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch recent emails' });
    }
});


// Create A/B Test
router.post('/create-test', async (req, res) => {
    try {
        const { name, versionA, versionB, prospects } = req.body;

        // Generate email content for both versions
        const contentA = await emailGenerator.generateEmail(versionA);
        const contentB = await emailGenerator.generateEmail(versionB);

        const test = new ABTest({
            name,
            versionA: { ...versionA, content: contentA },
            versionB: { ...versionB, content: contentB },
            prospects: prospects.map(email => ({ email, version: Math.random() < 0.5 ? 'A' : 'B' })),
        });

        await test.save();
        res.status(201).json(test);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create A/B test' });
    }
});

// Send A/B Test Emails
router.post('/send-test/:testId', async (req, res) => {
    try {
        const test = await ABTest.findById(req.params.testId);
        if (!test) {
            return res.status(404).json({ error: 'Test not found' });
        }

        for (const prospect of test.prospects) {
            const version = prospect.version === 'A' ? test.versionA : test.versionB;
            const email = new Email({
                recipient: prospect.email,
                subject: version.subject,
                content: version.content,
                testId: test._id,
                version: prospect.version,
            });
            await email.save();
            version.sentCount++;
        }

        await test.save();
        res.json({ message: 'A/B test emails sent successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to send A/B test emails' });
    }
});

// Get A/B Test Results
router.get('/test-results/:testId', async (req, res) => {
    try {
        const test = await ABTest.findById(req.params.testId);
        if (!test) {
            return res.status(404).json({ error: 'Test not found' });
        }

        const results = {
            name: test.name,
            versionA: {
                sentCount: test.versionA.sentCount,
                openCount: test.versionA.openCount,
                openRate: test.versionA.sentCount > 0 ? (test.versionA.openCount / test.versionA.sentCount) * 100 : 0,
            },
            versionB: {
                sentCount: test.versionB.sentCount,
                openCount: test.versionB.openCount,
                openRate: test.versionB.sentCount > 0 ? (test.versionB.openCount / test.versionB.sentCount) * 100 : 0,
            },
        };

        res.json(results);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch A/B test results' });
    }
});

router.get('/all', async (req, res) => {
    try {
        const tests = await ABTest.find().sort({ createdAt: -1 });
        res.json(tests);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch A/B tests' });
    }
});


export default router;
