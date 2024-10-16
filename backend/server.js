import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import AIEmailGenerator from './controllers/ai-email-generator.js';

dotenv.config();

const app = express();

app.use(express.json());
mongoose
    .connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log('DB connection successful!'))
    .catch((err) => console.error('DB connection error:', err));

app.use('/api/auth', authRoutes);

const emailGenerator = new AIEmailGenerator();

app.post('/api/generate-email', async (req, res) => {
    try {
        const emailContent = await emailGenerator.generateEmail(req.body);
        res.json(emailContent);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to generate email' });
    }
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        status: 'error',
        message: 'Something went wrong!',
    });
});

app.use('/api/email', authRoutes);
app.use('/api/ab-test', authRoutes);

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`App running on port ${port}`);
});

export default app;