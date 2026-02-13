//backend/models/Lead.js
const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
    // Property Details
    propertyAddress: { type: String, required: true, trim: true },
    propertyType: { type: String, trim: true },
    propertyCondition: { type: String, trim: true },
    bedrooms: Number,
    bathrooms: Number,
    
    // Situation
    sellingReason: { type: String, trim: true },
    timeframe: { type: String, trim: true },
    oweMortgage: { type: String, trim: true },
    additionalInfo: { type: String, trim: true },
    
    // Contact Info
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    preferredContact: { type: String, trim: true },
    smsConsent: { type: Boolean, default: false },
    
    // System Fields
    status: { type: String, default: 'New', enum: ['New', 'Contacted', 'Under Review', 'Offer Made', 'Closed', 'Not Interested'] },
    priority: { type: String, default: 'Medium', enum: ['High', 'Medium', 'Low'] },
    tracking: { type: Object, default: {} }, // Stores UTMs, gclid, etc.
    submittedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Lead', leadSchema);