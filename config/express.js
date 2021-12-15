const express    = require('express');
const config     = require('config');
const consign    = require('consign');
const cors       = require("cors");
const bodyParser = require('body-parser');
const responseTime = require('response-time')
const influxLogging = require('../api/middleware/influxLogging');
require('dotenv').config();

var corsOptions = { origin: "*" };

module.exports = () => {
  const app = express();
  var addRequestId = require('express-request-id')();
  
  // MOSTRAR req.id nos pedidos
  app.use(addRequestId);

  // USAR CORS
  app.use(cors(corsOptions));

  // MIDDLEWARES
  app.use(bodyParser.json({limit: '40mb', extended: true}))
  app.use(bodyParser.urlencoded({limit: '40mb', extended: true}))
  app.use(bodyParser.raw())

  // DEFINIR PORTA DO API
  app.set('port', process.env.PORT || config.get('server.port'));

  // DB SETUP
  const db = require("../api/models");
  db.mongoose.connect(db.url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false
  }).then(() => {
    console.log("Connected to the database!");
  }).catch(err => {
    console.log("Cannot connect to the database!", err);
    process.exit();
  });

  // INFLUX SETUP
  const Influx = require('influx');
  const influxInstance = new Influx.InfluxDB({
    host: process.env.INFLUXDB_HOST,
    port: process.env.INFLUXDB_PORT,
    database: process.env.INFLUXDB_DBNAME,
    schema: [
      {
        measurement: 'request_data',
        fields: {
          id: Influx.FieldType.STRING,
          timeStamp: Influx.FieldType.STRING,
          responseTime: Influx.FieldType.FLOAT,
          host: Influx.FieldType.STRING,
          requestUrl: Influx.FieldType.STRING,
          contentType: Influx.FieldType.STRING,
          originIp: Influx.FieldType.STRING,
          userAgent: Influx.FieldType.STRING,
          xAccessToken: Influx.FieldType.STRING,
          userId: Influx.FieldType.STRING,
          countryCode: Influx.FieldType.STRING,
          country: Influx.FieldType.STRING, 
          latitude: Influx.FieldType.FLOAT,
          longitude: Influx.FieldType.FLOAT,
          timezone: Influx.FieldType.STRING
        },
        tags: [
          'host'
        ]
      }
    ]
  })
  influxInstance.getDatabaseNames()
                .then(names => {
                  if (!names.includes(process.env.INFLUXDB_DBNAME)) {
                    return influxInstance.createDatabase(process.env.INFLUXDB_DBNAME);
                  }
                })
                .catch(err => console.error(`Error creating Influx database!`, err) )

  // registar metricas de pedidos
  app.use(responseTime((req, res, time) => {
    influxLogging(req, influxInstance, time)
  }, { digits: 3 }))

  // ROTA INICIAL (DEFAULT)
  app.get("/", (req, res) => {
    res.header("Content-Type",'application/json');
    res.send(JSON.stringify({ 
      id: req.id,
      intro: "Proofing API developed by Rafael Jesus Saraiva",
      publicRoutes: [
        "PUT  /account",
        "POST /account/login",
        "GET  /album",
        "GET  /photo_size/all",
        "GET  /promotion/[promotion_code]"
      ],
      authedRoutes: [
        "GET  /account",
        "POST /account/[account_id]",
        "PUT  /order",
        "GET  /order",
      ]
    }, null, 4));
  });

  consign({'cwd':'api'})
    .then('controllers')
    .then('routes')
    .into(app)

  return app;
};