const LIMITS = {
    fullName: 100,
    email: 254,
    phone: 20,
    propertyAddress: 300,
    additionalInfo: 2000,
    sellingReason: 100,
    timeframe: 100,
    oweMortgage: 50,
    source: 80
};

const ALLOWED = {
    propertyType: ['Single Family', 'Multi-Family', 'Condo', 'Townhouse', 'Mobile Home', 'Land'],
    propertyCondition: ['Excellent', 'Good', 'Fair', 'Needs Work', 'Poor'],
    preferredContact: ['Phone', 'Email', 'Text']
};

function cleanText(value, maxLength) {
    if (value === undefined || value === null) return '';
    return String(value).replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function normalizePhone(value) {
    const raw = cleanText(value, LIMITS.phone);
    const digits = raw.replace(/\D/g, '');
    return raw.startsWith('+') ? `+${digits}` : digits;
}

function validateInquiry(body = {}) {
    const inquiry = {
        propertyAddress: cleanText(body.propertyAddress || body.address, LIMITS.propertyAddress),
        propertyType: cleanText(body.propertyType, 50),
        propertyCondition: cleanText(body.propertyCondition, 50),
        bedrooms: body.bedrooms === '' || body.bedrooms == null ? null : Number(body.bedrooms),
        bathrooms: body.bathrooms === '' || body.bathrooms == null ? null : Number(body.bathrooms),
        sellingReason: cleanText(body.sellingReason, LIMITS.sellingReason),
        timeframe: cleanText(body.timeframe, LIMITS.timeframe),
        oweMortgage: cleanText(body.oweMortgage, LIMITS.oweMortgage),
        additionalInfo: cleanText(body.additionalInfo || body.message, LIMITS.additionalInfo),
        fullName: cleanText(body.fullName || body.name, LIMITS.fullName),
        email: cleanText(body.email, LIMITS.email).toLowerCase(),
        phone: normalizePhone(body.phone),
        preferredContact: cleanText(body.preferredContact, 20),
        smsConsent: body.smsConsent === true || body.smsConsent === 'true' || body.smsConsent === 'on',
        source: cleanText(body.source || 'website_form', LIMITS.source),
        tracking: {}
    };

    const errors = [];
    if (inquiry.fullName.length < 2) errors.push('Please provide your full name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inquiry.email)) errors.push('Please provide a valid email address.');
    if (!/^\+?\d{10,15}$/.test(inquiry.phone)) errors.push('Please provide a valid phone number.');
    if (inquiry.propertyAddress.length < 5) errors.push('Please provide the property address.');

    for (const [field, allowedValues] of Object.entries(ALLOWED)) {
        if (inquiry[field] && !allowedValues.includes(inquiry[field])) errors.push(`Please provide a valid ${field}.`);
    }
    if (inquiry.bedrooms !== null && (!Number.isFinite(inquiry.bedrooms) || inquiry.bedrooms < 0 || inquiry.bedrooms > 100)) errors.push('Please provide a valid bedroom count.');
    if (inquiry.bathrooms !== null && (!Number.isFinite(inquiry.bathrooms) || inquiry.bathrooms < 0 || inquiry.bathrooms > 100)) errors.push('Please provide a valid bathroom count.');

    const trackingInput = body.tracking && typeof body.tracking === 'object' && !Array.isArray(body.tracking) ? body.tracking : {};
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'gclid', 'fbclid', 'referrer']) {
        inquiry.tracking[key] = cleanText(trackingInput[key] || body[key], key === 'referrer' ? 500 : 200);
    }

    return { inquiry, errors };
}

module.exports = { validateInquiry };

