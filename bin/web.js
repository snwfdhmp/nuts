var express = require('express');
var uuid = require('uuid');
var basicAuth = require('basic-auth');
var Analytics = require('analytics-node');
var nuts = require('../');

var app = express();

var api_username = "Etsurosu";
var api_password = "g-qr3]<s";
var github_token = "1465dd09fb02a1b22961bdbd9a363187be7279ea";
var github_repo = "Etsurosu/odc-maj-auto";
var nuts_port = 7004;
var trust_proxy="loopback";


var apiAuth =  {
    username: process.env.API_USERNAME || api_username,
    password: process.env.API_PASSWORD || api_password
};

var analytics = undefined;
var downloadEvent = process.env.ANALYTICS_EVENT_DOWNLOAD || 'download';
if (process.env.ANALYTICS_TOKEN) {
    analytics = new Analytics(process.env.ANALYTICS_TOKEN);
}

var myNuts = nuts.Nuts({
    repository: process.env.GITHUB_REPO || github_repo,
    token: process.env.GITHUB_TOKEN || github_token,
    endpoint: process.env.GITHUB_ENDPOINT,
    username: process.env.GITHUB_USERNAME || api_username,
    password: process.env.GITHUB_PASSWORD || api_password,
    timeout: process.env.VERSIONS_TIMEOUT,
    cache: process.env.VERSIONS_CACHE,
    refreshSecret: process.env.GITHUB_SECRET,
    proxyAssets: !Boolean(process.env.DONT_PROXY_ASSETS)
});

// Control access to API
myNuts.before('api', function(access, next) {
    if (!apiAuth.username) return next();

    function unauthorized() {
        next(new Error('Invalid username/password for API'));
    };

    var user = basicAuth(access.req);
    if (!user || !user.name || !user.pass) {
        return unauthorized();
    };

    if (user.name === apiAuth.username && user.pass === apiAuth.password) {
        return next();
    } else {
        return unauthorized();
    };
});

// Log download
myNuts.before('download', function(download, next) {
    console.log('download', download.platform.filename, "for version", download.version.tag, "on channel", download.version.channel, "for", download.platform.type);

    next();
});
myNuts.after('download', function(download, next) {
    console.log('downloaded', download.platform.filename, "for version", download.version.tag, "on channel", download.version.channel, "for", download.platform.type);

    // Track on segment if enabled
    if (analytics) {
        var userId = download.req.query.user;

        analytics.track({
            event: downloadEvent,
            anonymousId: userId? null : uuid.v4(),
            userId: userId,
            properties: {
                version: download.version.tag,
                channel: download.version.channel,
                platform: download.platform.type,
                os: nuts.platforms.toType(download.platform.type)
            }
        });
    }

    next();
});

if (process.env.TRUST_PROXY) {
    try {
        var trustProxyObject = JSON.parse(process.env.TRUST_PROXY);
        app.set('trust proxy', trustProxyObject);
    }
    catch (e) {
        app.set('trust proxy', process.env.TRUST_PROXY);
    }
}

app.use(myNuts.router);

// Error handling
app.use(function(req, res, next) {
    res.status(404).send("Page not found");
});
app.use(function(err, req, res, next) {
    var msg = err.message || err;
    var code = 500;

    console.error(err.stack || err);

    // Return error
    res.format({
        'text/plain': function(){
            res.status(code).send(msg);
        },
        'text/html': function () {
            res.status(code).send(msg);
        },
        'application/json': function (){
            res.status(code).send({
                'error': msg,
                'code': code
            });
        }
    });
});

myNuts.init()

// Start the HTTP server
.then(function() {
    var server = app.listen(process.env.PORT || nuts_port || 5000, function () {
        var host = server.address().address;
        var port = server.address().port;

        console.log('Listening at http://%s:%s', host, port);
    });
}, function(err) {
    console.log(err.stack || err);
    process.exit(1);
});
