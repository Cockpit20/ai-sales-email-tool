// A/B Test Schema
import mongoose from 'mongoose';


const abTestSchema = new mongoose.Schema({
    name: String,
    versionA: {
        subject: String,
        content: String,
        sentCount: { type: Number, default: 0 },
        openCount: { type: Number, default: 0 },
    },
    versionB: {
        subject: String,
        content: String,
        sentCount: { type: Number, default: 0 },
        openCount: { type: Number, default: 0 },
    },
    prospects: [{ email: String, version: String }],
    createdAt: { type: Date, default: Date.now },
});

const ABTest = mongoose.model('ABTest', abTestSchema);

export default ABTest;