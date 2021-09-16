const jwt = require("jsonwebtoken");
const config = process.env;
const Account = require("../models").account;

const isAuthenticated = (req, res, next) => {
    const token = req.body.token || req.query.token || req.headers["x-access-token"];

    if (!token) {
        return res.status(401).send({
            status: 'error',
            message: "Necessário um token para efetuar o pedido."
        });
    }

    let decoded;

    try {
        decoded = jwt.verify(token, config.TOKEN_KEY);
    } catch (err) {
        return res.status(401).send({
            status: 'invalid',
            message: "Token inválido - " + err
        });
    }

    Account.findOne({ _id: decoded.user_id })
    .then(user => { 
        if (!user) {
            return res.status(404).send({
                status: 'error',
                message: `Nenhuma conta encontrada com id => (${decoded.user_id}).`
            });
        }
        req.user = decoded;
        return next();
    })
};

const isAdmin = (req, res, next) => {
    const token = req.body.token || req.query.token || req.headers["x-access-token"];

    if (!token) {
        return res.status(401).send({
            status: 'error',
            message: "Necessário um token para efetuar o pedido."
        });
    }

    let decoded;

    try {
        decoded = jwt.verify(token, config.TOKEN_KEY);
    } catch (err) {
        return res.status(401).send({
            status: 'invalid',
            message: "Token inválido - " + err
        });
    }

    Account.findOne({ _id: decoded.user_id })
    .then(user => { 
        if (!user) {
            return res.status(404).send({
                status: 'error',
                message: `Nenhuma conta encontrada com id => (${decoded.user_id})!`
            });
        }
        if (user.role !== 'admin') {
            return res.status(403).send({
                status: 'error',
                message: "Token não tem privilégios para realizar o pedido."
            });
        }
        req.user = decoded;
    })

    return next();
};

module.exports = {
    isAuthenticated: isAuthenticated,
    isAdmin: isAdmin
};