const jwt = require("jsonwebtoken");
var ipInfo = require("ip-info-finder");
const config = process.env;

const influxLogging = async (req, influxInstance, time) => {
    let theader = req.headers;
    let decoded;
    try {
        decoded = jwt.verify(theader['x-access-token'], config.TOKEN_KEY);
    } catch (err) {
        decoded = null;
    }

    let toriginIp = (req.headers['x-forwarded-for'] || '').split(',').pop().trim() || req.socket.remoteAddress || null;

    let location = await ipInfo.getIPInfo(toriginIp).catch(err => console.log(err));
    
    if (location.message !== 'private range') {
        let data = {
            // request info
            id: req.id,
            timeStamp: new Date(),
            responseTime: time,
            host: theader.host,
            requestUrl: req.originalUrl,
            contentType: theader['content-type'],
            // client info
            originIp: toriginIp,
            userAgent: theader['user-agent'],
            xAccessToken: theader['x-access-token'] || null,
            userId: (decoded) ? decoded.user_id : null,
            // location data
            countryCode: (location.status === 'success') ? location.countryCode : null,
            country: (location.status === 'success') ? location.country : null, 
            latitude: (location.status === 'success') ? location.lat : null,
            longitude: (location.status === 'success') ? location.lon : null,
            timezone: (location.status === 'success') ? location.timezone : null
        }
    
        await influxInstance.writePoints([
            {
              measurement: 'request_data',
              tags: { host: 'expressApi' },
              fields: data,
            }
        ]).catch(err => {
            console.error(`Error saving data to InfluxDB! ${err.stack}`)
        })
    }
}

module.exports = influxLogging;