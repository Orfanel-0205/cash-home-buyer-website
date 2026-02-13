//backend/utils/Email.js
// ===========================
// EMAIL UTILITY - Nodemailer with Gmail
// ===========================

const nodemailer = require('nodemailer');

// Create transporter using Gmail
// NOTE: You need to enable "App Passwords" in your Google Account
// Go to: Google Account > Security > 2-Step Verification > App Passwords
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Verify transporter configuration
transporter.verify((error, success) => {
    if (error) {
        console.error('✗ Email configuration error:', error);
    } else {
        console.log('✓ Email server is ready');
    }
});

// ===========================
// SEND CONFIRMATION EMAIL TO SELLER
// ===========================

const sendLeadConfirmation = async (lead) => {
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: #D32F2F;
            color: white;
            padding: 30px 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
        }
        .content {
            background: #f5f5f5;
            padding: 30px 20px;
        }
        .info-box {
            background: white;
            padding: 20px;
            margin: 20px 0;
            border-radius: 5px;
            border-left: 4px solid #D32F2F;
        }
        .info-box h3 {
            margin-top: 0;
            color: #D32F2F;
        }
        .info-row {
            margin: 10px 0;
        }
        .label {
            font-weight: bold;
            color: #666;
        }
        .footer {
            text-align: center;
            padding: 20px;
            color: #666;
            font-size: 14px;
        }
        .button {
            display: inline-block;
            padding: 12px 30px;
            background: #D32F2F;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏠 Thank You for Your Submission!</h1>
        </div>
        
        <div class="content">
            <h2>Hi ${lead.fullName},</h2>
            
            <p>We've received your information and will contact you within <strong>24 hours</strong> with a fair cash offer for your property.</p>
            
            <div class="info-box">
                <h3>What Happens Next?</h3>
                <p>1. Our team will review your property details<br>
                2. We'll prepare a fair cash offer<br>
                3. You'll receive our offer within 24 hours<br>
                4. If you accept, we can close in as little as 7 days!</p>
            </div>
            
            <div class="info-box">
                <h3>Your Property Information</h3>
                <div class="info-row">
                    <span class="label">Property Address:</span> ${lead.propertyAddress}
                </div>
                <div class="info-row">
                    <span class="label">Property Type:</span> ${lead.propertyType}
                </div>
                <div class="info-row">
                    <span class="label">Condition:</span> ${lead.propertyCondition}
                </div>
                <div class="info-row">
                    <span class="label">Preferred Contact:</span> ${lead.preferredContact}
                </div>
            </div>
            
            <p><strong>Questions?</strong> Feel free to call us at <strong>1-800-CASH-NOW</strong> or reply to this email.</p>
            
            <p>We're excited to help you sell your house quickly and hassle-free!</p>
            
            <p>Best regards,<br>
            <strong>The US Cash Buyers Team</strong></p>
        </div>
        
        <div class="footer">
            <p>US Cash Buyers | Available Nationwide<br>
            Email: info@uscashbuyers.com | Phone: 1-800-CASH-NOW</p>
            <p style="font-size: 12px; color: #999;">
                You received this email because you submitted a property for a cash offer on our website.
            </p>
        </div>
    </div>
</body>
</html>
    `;
    
    const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: lead.email,
        subject: 'We Received Your Property Information - Cash Offer Coming Soon!',
        html: emailHtml
    };
    
    try {
        await transporter.sendMail(mailOptions);
        console.log(`✓ Confirmation email sent to ${lead.email}`);
    } catch (error) {
        console.error('✗ Error sending confirmation email:', error);
        throw error;
    }
};

// ===========================
// SEND NOTIFICATION EMAIL TO ADMIN
// ===========================

const sendAdminNotification = async (lead) => {
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
        }
        .container {
            max-width: 700px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: #1976D2;
            color: white;
            padding: 20px;
            text-align: center;
        }
        .priority {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: bold;
            margin-top: 10px;
        }
        .urgent { background: #D32F2F; }
        .high { background: #FFA000; }
        .medium { background: #1976D2; }
        .low { background: #4CAF50; }
        .content {
            background: #f5f5f5;
            padding: 20px;
        }
        .section {
            background: white;
            padding: 20px;
            margin: 15px 0;
            border-radius: 5px;
        }
        .section h3 {
            margin-top: 0;
            color: #1976D2;
            border-bottom: 2px solid #1976D2;
            padding-bottom: 10px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 150px 1fr;
            gap: 10px;
            margin: 10px 0;
        }
        .label {
            font-weight: bold;
            color: #666;
        }
        .button {
            display: inline-block;
            padding: 12px 30px;
            background: #1976D2;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 10px 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔔 New Lead Received!</h1>
            <div class="priority ${lead.priority.toLowerCase()}">${lead.priority} Priority</div>
        </div>
        
        <div class="content">
            <div class="section">
                <h3>📍 Property Information</h3>
                <div class="info-grid">
                    <div class="label">Address:</div>
                    <div>${lead.propertyAddress}</div>
                    
                    <div class="label">Type:</div>
                    <div>${lead.propertyType}</div>
                    
                    <div class="label">Condition:</div>
                    <div>${lead.propertyCondition}</div>
                    
                    <div class="label">Bedrooms:</div>
                    <div>${lead.bedrooms || 'Not specified'}</div>
                    
                    <div class="label">Bathrooms:</div>
                    <div>${lead.bathrooms || 'Not specified'}</div>
                </div>
            </div>
            
            <div class="section">
                <h3>📊 Situation</h3>
                <div class="info-grid">
                    <div class="label">Reason:</div>
                    <div>${lead.sellingReason}</div>
                    
                    <div class="label">Timeframe:</div>
                    <div><strong>${lead.timeframe}</strong></div>
                    
                    <div class="label">Mortgage:</div>
                    <div>${lead.oweMortgage || 'Not specified'}</div>
                </div>
                ${lead.additionalInfo ? `
                <div style="margin-top: 15px;">
                    <div class="label">Additional Details:</div>
                    <div style="background: #f5f5f5; padding: 10px; margin-top: 5px; border-radius: 5px;">
                        ${lead.additionalInfo}
                    </div>
                </div>
                ` : ''}
            </div>
            
            <div class="section">
                <h3>👤 Contact Information</h3>
                <div class="info-grid">
                    <div class="label">Name:</div>
                    <div><strong>${lead.fullName}</strong></div>
                    
                    <div class="label">Email:</div>
                    <div><a href="mailto:${lead.email}">${lead.email}</a></div>
                    
                    <div class="label">Phone:</div>
                    <div><a href="tel:${lead.phone}">${lead.phone}</a></div>
                    
                    <div class="label">Preferred Contact:</div>
                    <div>${lead.preferredContact}</div>
                    
                    <div class="label">SMS Consent:</div>
                    <div>${lead.smsConsent ? 'Yes ✓' : 'No'}</div>
                </div>
            </div>
            
            <div class="section">
                <h3>📈 Tracking Data</h3>
                <div class="info-grid">
                    ${lead.tracking.utm_source ? `
                    <div class="label">Source:</div>
                    <div>${lead.tracking.utm_source}</div>
                    ` : ''}
                    
                    ${lead.tracking.utm_campaign ? `
                    <div class="label">Campaign:</div>
                    <div>${lead.tracking.utm_campaign}</div>
                    ` : ''}
                    
                    ${lead.tracking.gclid ? `
                    <div class="label">Google Click ID:</div>
                    <div>${lead.tracking.gclid}</div>
                    ` : ''}
                    
                    <div class="label">Submitted:</div>
                    <div>${new Date(lead.submittedAt).toLocaleString()}</div>
                </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px;">
                <a href="http://your-domain.com/admin/leads/${lead._id}" class="button">View Full Lead →</a>
                <a href="tel:${lead.phone}" class="button" style="background: #4CAF50;">Call Now</a>
            </div>
        </div>
    </div>
</body>
</html>
    `;
    
    const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: process.env.ADMIN_EMAIL,
        subject: `🔔 New ${lead.priority} Priority Lead - ${lead.propertyAddress}`,
        html: emailHtml
    };
    
    try {
        await transporter.sendMail(mailOptions);
        console.log(`✓ Admin notification email sent for lead ${lead._id}`);
    } catch (error) {
        console.error('✗ Error sending admin notification:', error);
        throw error;
    }
};

module.exports = {
    sendLeadConfirmation,
    sendAdminNotification
};