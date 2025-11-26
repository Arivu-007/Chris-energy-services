const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const { body, validationResult } = require('express-validator');
const dotenv = require('dotenv');

dotenv.config();

const {
    PORT = 4000,
    SMTP_HOST,
    SMTP_PORT = 587,
    SMTP_SECURE = 'false',
    SMTP_USER,
    SMTP_PASS,
    NOTIFY_TO,
    NOTIFY_FROM,
} = process.env;

if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !NOTIFY_TO || !NOTIFY_FROM) {
    console.warn(
        'Warning: Missing SMTP/notification environment variables. ' +
        'Email delivery will fail until they are configured.'
    );
}

const app = express();

app.use(cors());
app.use(express.json());

const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: SMTP_SECURE === 'true',
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
    },
});

app.post(
    '/api/enquiry',
    [
        body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 120 }),
        body('email').trim().isEmail().withMessage('Valid email is required'),
        body('message').trim().notEmpty().withMessage('Message is required').isLength({ max: 2000 }),
        body('phone').optional().trim().isLength({ max: 40 }),
        body('service').optional().trim().isLength({ max: 60 }),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                message: 'Validation failed',
                errors: errors.array(),
            });
        }

        const { name, email, phone, service, message } = req.body;

        const mailOptions = {
            from: NOTIFY_FROM,
            to: NOTIFY_TO,
            subject: `New enquiry from ${name}`,
            text: [
                `Name: ${name}`,
                `Email: ${email}`,
                phone ? `Phone: ${phone}` : '',
                service ? `Service: ${service}` : '',
                '---',
                message,
            ]
                .filter(Boolean)
                .join('\n'),
            html: `
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
                ${service ? `<p><strong>Service:</strong> ${service}</p>` : ''}
                <hr />
                <p>${message.replace(/\n/g, '<br>')}</p>
            `,
        };

        try {
            await transporter.sendMail(mailOptions);
            return res.json({
                status: 'success',
                message: 'Enquiry received. We will be in touch soon.',
            });
        } catch (error) {
            console.error('Email send failed:', error);
            return res.status(500).json({
                status: 'error',
                message: 'Unable to send enquiry at the moment. Please try again later.',
            });
        }
    }
);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        status: 'error',
        message: 'Internal server error',
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

