const mongoose = require('mongoose');

const trackingSchema = new mongoose.Schema({
    utm_source: String,
    utm_medium: String,
    utm_campaign: String,
    gclid: String,
    fbclid: String,
    referrer: String,
    userAgent: String,
    timestamp: { type: Date, default: Date.now }
});

const leadSchema = new mongoose.Schema({
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    propertyAddress: { type: String, required: true, trim: true },
    propertyType: { type: String, enum: ['Single Family', 'Multi-Family', 'Condo', 'Townhouse', 'Mobile Home', 'Land'], required: true },
    propertyCondition: { type: String, enum: ['Excellent', 'Good', 'Fair', 'Needs Work', 'Poor'], required: true },
    bedrooms: Number,
    bathrooms: Number,
    sellingReason: { type: String, required: true },
    timeframe: { type: String, required: true },
    oweMortgage: String,
    additionalInfo: String,
    preferredContact: { type: String, enum: ['Phone', 'Email', 'Text'] },
    smsConsent: { type: Boolean, default: false },
    tracking: trackingSchema,
    status: { type: String, default: 'New', enum: ['New', 'Contacted', 'Qualified', 'Unqualified', 'Closed'] },
    submittedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});

leadSchema.methods.updateStatus = function(newStatus, updatedBy) {
    this.status = newStatus;
    // You might want to log who updated the status
    // this.history.push({ status: newStatus, updatedBy, timestamp: new Date() });
    return this.save();
};

leadSchema.methods.addNote = function(content, createdBy) {
    // Assuming you add a 'notes' field to your schema
    // this.notes.push({ content, createdBy, timestamp: new Date() });
    return this.save();
};

module.exports = mongoose.model('Lead', leadSchema);