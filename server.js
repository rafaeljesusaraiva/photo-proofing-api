const app = require('./config/express')();
const port = app.get('port');
require('dotenv').config();

// RODANDO NOSSA APLICAÇÃO NA PORTA SETADA
app.listen(port, () => {
  global.__basedir = __dirname;

  var os = require("os");
  
  console.log('------------------------------------');
  console.log('Development version: 1.3.1');
  console.log('Running on host: '+os.hostname());
  console.log(`Available at port: ${port}`);
  console.log('------------------------------------');
});