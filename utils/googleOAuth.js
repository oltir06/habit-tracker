const { google } = require('googleapis');
const logger = require('./logger');

// Create OAuth2 client
const getOAuth2Client = () => {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_CALLBACK_URL
    );
};

// Generate authorization URL
const getAuthUrl = () => {
    const oauth2Client = getOAuth2Client();

    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email'
        ]
    });
};

// Exchange authorization code for tokens and get user info
const getGoogleUser = async (code) => {
    try {
        const oauth2Client = getOAuth2Client();

        // Exchange code for tokens
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        // Get user info
        const oauth2 = google.oauth2({
            auth: oauth2Client,
            version: 'v2'
        });

        const { data } = await oauth2.userinfo.get();

        return {
            googleId: data.id,
            email: data.email,
            name: data.name,
            picture: data.picture
        };

    } catch (error) {
        logger.error('Google OAuth error', { error: error.message });
        throw new Error('Failed to get Google user info');
    }
};

module.exports = {
    getAuthUrl,
    getGoogleUser
};
