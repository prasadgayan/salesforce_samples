import express from 'express';
import jsforce from 'jsforce';
import bodyParser from 'body-parser';
import session from 'express-session';
import { config } from 'dotenv';
config();

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, SALESFORCE_LOGIN_URL } = process.env;

console.log({
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI,
    SALESFORCE_LOGIN_URL
});

app.use(session({
    secret: 'DSEILksdkf_dslfdksdfjkD',
    resave: false,
    saveUninitialized: true
}));

const oauth2 = new jsforce.OAuth2({
    loginUrl: SALESFORCE_LOGIN_URL,
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    redirectUri: REDIRECT_URI
});

app.get('/login', (req, res) => {
    res.redirect(oauth2.getAuthorizationUrl({ scope: 'api refresh_token' }));
});

app.get('/sfoauth2/callback', (req, res) => {
    const conn = new jsforce.Connection({ oauth2 });
    const code = req.query.code;
    conn.authorize(code, (err, userInfo) => {
        if (err) {
            return res.status(500).send(err);
        }
        req.session.accessToken = conn.accessToken;
        req.session.refreshToken = conn.refreshToken;
        req.session.instanceUrl = conn.instanceUrl;
        res.redirect('/objects');
    });
});

app.get('/objects', (req, res) => {
    if (!req.session.accessToken || !req.session.instanceUrl) {
        return res.redirect('/login');
    }

    const conn = new jsforce.Connection({
        accessToken: req.session.accessToken,
        instanceUrl: req.session.instanceUrl
    });

    conn.describeGlobal((err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.send(result.sobjects);
    });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

// Optionally, export the app for further use
export default app;
