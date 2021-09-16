const app = require('./config/express')();
const port = app.get('port');
require('dotenv').config();

// RODANDO NOSSA APLICAÇÃO NA PORTA SETADA
app.listen(port, () => {
  global.__basedir = __dirname;
  
  console.log(`API disponível na porta ${port}`)
});