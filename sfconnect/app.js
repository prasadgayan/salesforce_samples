import express from 'express';
import jsforce from 'jsforce';
import bodyParser from 'body-parser';
import passport from 'passport';
import session from 'express-session';
import { Strategy as OAuth2Strategy } from 'passport-oauth2';
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
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true
}));

passport.use('salesforce', new OAuth2Strategy({
    authorizationURL: `${SALESFORCE_LOGIN_URL}/services/oauth2/authorize`,
    tokenURL: `${SALESFORCE_LOGIN_URL}/services/oauth2/token`,
    clientID: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    callbackURL: REDIRECT_URI
},
(accessToken, refreshToken, params, profile, done) => {
    const instanceUrl = params.instance_url;
    console.log('Access Token:', accessToken);
    console.log('Refresh Token:', refreshToken);
    console.log('Instance URL:', instanceUrl);
    console.log('Profile:', profile);
    done(null, { accessToken, refreshToken, instanceUrl, profile });
}));


app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

app.get('/login', passport.authenticate('salesforce'));

app.get('/sfoauth2/callback', passport.authenticate('salesforce', { failureRedirect: '/' }),
(req, res) => {
    req.session.accessToken = req.user.accessToken;
    req.session.instanceUrl = req.user.instanceUrl;
    res.redirect('/objects');
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
