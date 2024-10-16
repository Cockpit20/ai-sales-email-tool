import { OpenAI } from "openai";
import dotenv from 'dotenv';
dotenv.config();

class AIEmailGenerator {
    constructor() {
        this.api = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            baseURL: "https://api.aimlapi.com/v1",
        });
    }

    async generateEmail(params) {
        const { recipientName, company, purpose, additionalInfo } = params;
        const systemPrompt = "You are a professional email writer. Format the email with a greeting, body, and signature.";
        const userPrompt = `Write a professional email to ${recipientName} from ${company}. The purpose of the email is to ${purpose}. Additional information: ${additionalInfo}`;

        try {
            console.log("Sending request to OpenAI API...");
            console.log("System Prompt:", systemPrompt);
            console.log("User Prompt:", userPrompt);

            const completion = await this.api.chat.completions.create({
                model: "mistralai/Mistral-7B-Instruct-v0.2",
                messages: [
                    {
                        role: "system",
                        content: systemPrompt,
                    },
                    {
                        role: "user",
                        content: userPrompt,
                    },
                ],
                temperature: 0.7,
                max_tokens: 500,
            });

            console.log("API Response:", JSON.stringify(completion, null, 2));

            const emailContent = completion.choices[0].message.content.trim();
            return this.formatEmail(emailContent);
        } catch (error) {
            console.error('Error generating email:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));

            if (error.response) {
                console.error('Response data:', error.response.data);
                console.error('Response status:', error.response.status);
                console.error('Response headers:', error.response.headers);
            }

            throw new Error(`Failed to generate email content: ${error.message}`);
        }
    }

    formatEmail(content) {
        const paragraphs = content.split('\n\n');
        return {
            greeting: paragraphs[0],
            body: paragraphs.slice(1, -1).join('\n\n'),
            signature: paragraphs[paragraphs.length - 1],
        };
    }
}

export default AIEmailGenerator;