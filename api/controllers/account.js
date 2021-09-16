const db = require("../models");
const Account = db.account;
const jwt = require('jsonwebtoken');
const bcrypt = require("bcryptjs");
const nodemailer = require('nodemailer');
var dayjs = require('dayjs');
require('dayjs/locale/pt')
dayjs.locale('pt')
const { v4: uuidv4 } = require('uuid');

module.exports = () => {
    const controller = {};
  
    controller.create = (req, res) => {

        const { name, email, password, phoneNumber } = req.body;

        // Validate request
        if (Object.keys(req.body).length === 0) {
            return res.status(400).send({
                status: 'invalid',
                message: "Pedido à espera de 'name', 'email' e 'password' (opcional 'phoneNumber')."
            });
        }

        const newAccount = new Account({
            name: name,
            email: email,
            password: password,
            phoneNumber: phoneNumber ? phoneNumber : false
        });

        const token = jwt.sign(
            { user_id: newAccount._id, email: email },
            process.env.TOKEN_KEY,
            {
              expiresIn: "12h",
            }
        );
        // save user token
        newAccount.token = token;

        newAccount.save(newAccount) 
                    .then(data => { 
                        res.send({ 
                            status: 'success', 
                            message: data 
                        }); 
                    })
                    .catch(err => {
                        return res.status(500).send({
                            status: 'error',
                            message: 'Erro ao salvar nova conta => ' + err
                        });
                    });

    };

    controller.findOne = (req, res) => {
        const email = req.body.email;
        const name = req.body.name;
        const phone = req.body.phone;

        if (Object.keys(req.body).length === 0) {
            return res.status(400).send({
                status: 'invalid',
                message: "Pedido à espera de 'name', 'email' ou 'phoneNumber'."
            });
        }

        var condition;
        if (email) {
            condition = email ? { email: { $regex: new RegExp(email), $options: "i" } } : {};
        } else if (name) {
            condition = name ? { name: { $regex: new RegExp(name), $options: "i" } } : {};
        } else if (phone) {
            condition = phone ? { phone: phone } : {};
        }

        Account.findOne(condition)
            .then(data => {
                if (data === null || !data) throw `Conta não encontrada com a condição => (${condition})!`;
                res.send({ 
                    status: 'success', 
                    message: data 
                });
            })
            .catch(err => {
                return res.status(500).send({
                    status: 'error',
                    message: 'Erro ao procurar conta => ' + err
                });
            });
    };

    controller.findAll = (req, res) => {
        Account.find({})
        .then(data => { 
            res.send({ 
                status: 'success', 
                message: data 
            }); 
        })
        .catch(err => {
            return res.status(500).send({
                status: 'error',
                message: 'Erro ao procurar todas as contas => ' + err
            });
        });
    };

    controller.update = (req, res) => {
        if (Object.keys(req.body).length === 0) {
            return res.status(400).send({
                status: 'invalid',
                message: "À espera de pelo menos um campo para atualizar conta!"
            });
        }
    
        const id = req.params.id;

        console.log('aqui')
    
        Account.findByIdAndUpdate(id, req.body, { useFindAndModify: false })
        .then(data => {
            if (data === null || !data) throw 'Conta não encontrada!';
            console.log('aqui2 ', data)
            res.send({ 
                status: 'success',
                message: `Conta '${data.name}' foi atualizada com sucesso!` 
            });
        })
        .catch(err => {
            console.log('aqui2 ', err)
            return res.status(500).send({
                status: 'error',
                message: 'Erro ao atualizar conta. ' + err
            });
        });
    };

    controller.delete = (req, res) => {
        const id = req.params.id;

        Account.findByIdAndRemove(id)
        .then(data => {
            if (data === null || !data) throw 'Conta não encontrada!';
            res.send({
                status: 'success',
                message: "Conta apagada com sucesso!"
            });
        })
        .catch(err => {
            return res.status(500).send({
                status: 'error',
                message: `Erro ao apagar conta com id => (${id}). ` + err
            });
        });
    };

    controller.login = async (req, res) => {
        try {
            // Get user input
            const { email, password } = req.body;

            // Validate user input
            if (!(email && password)) {
                return res.status(400).send({
                    status: 'invalid',
                    message: "Pedido à espera de 'email' e 'password'."
                });
            }

            // Validate if user exist in our database
            const user = await Account.findOne({ email });

            if (user && (await bcrypt.compare(password, user.password))) {
                // Create token
                const token = jwt.sign(
                    { user_id: user._id, email },
                    process.env.TOKEN_KEY,
                    { expiresIn: "7d" }
                );
                // save user token
                user.token = token;
                // user
                return res.send({
                    status: 'success',
                    message: user
                });
            }
            
            return res.status(400).send({
                status: 'invalid',
                message: "Credenciais inválidas."
            });
        } catch (err) {
            return res.status(500).send({
                status: 'error',
                message: "Erro de API. " + err
            });
        }
    }

    controller.resetPassword = async (req, res) => {
        const user = await Account.findOne({ email: req.body.email })
        if (user === null) {
            return res.status(500).send({
                status: 'error',
                message: 'Conta não encontrada'
            });
        }

        const tDate = dayjs().add(30, 'minute');
        let validationObject = { validUntil: dayjs(tDate).format(), token: uuidv4() }
        user.emailValidationToken = JSON.stringify(validationObject);
        user.save(function (err) {
            if(err) {
                console.log(err)
                return res.status(500).send({
                    status: 'error',
                    message: 'Erro ao atualizar emailValidationToken', err
                });
            }
        });

        let transporter = nodemailer.createTransport({
            host: process.env.NODEMAILER_HOST,
            secure: true,
            port: process.env.NODEMAILER_PORT,
            auth: {
              user: process.env.NODEMAILER_USER,
              pass: process.env.NODEMAILER_PASS,
            },
        });

        const mailOptions = {
            from: 'noreply <noreply@rafaeljesusaraiva.pt>', // sender address
            to: req.body.email, // 
            subject: '[Prova Fotografias] Repor palavra-passe', // Subject line
            html: `Se não pretende alterar a sua palavra-passe, ignore este email. Caso contrário, o link é válido por 30 minutos. (Até às ${dayjs(validationObject.validUntil).format('HH:mm [de] DD/MM/YYYY')}) <br/><br/> http://192.168.1.69:8080/alterar-password?token=`+validationObject.token, // plain text body
        };
        await transporter.sendMail(mailOptions, function(err, info) {
            if (err) {
                console.log(err)
                return res.status(500).send({
                    status: 'error',
                    message: "Erro ao enviar email. ", err
                })
            }
        })

        res.send({ 
            status: 'success', 
            message: 'Email Sent!', validationObject
        });
    }

    controller.userChangePassword = async (req, res) => {
        let token = req.body.token;
        let newPassword = req.body.password;

        const user = await Account.findOne({ emailValidationToken: { $regex: new RegExp(token), $options: "i" } })
        if (user === null) {
            return res.status(500).send({
                status: 'error',
                message: "Não existe conta associada ao token fornecido, possivelmente já foi usado. "
            })
        }
        const tokenDate = JSON.parse(user.emailValidationToken)
        const isValid = dayjs().isBefore(tokenDate.validUntil)
        
        if (isValid) {
            const salt = bcrypt.genSaltSync();
            const hashedPassword = bcrypt.hashSync(newPassword, salt);

            user.password = hashedPassword;
            user.emailValidationToken = '';
            user.save(function (err) {
                if(err) {
                    console.log(err)
                    return res.status(500).send({
                        status: 'error',
                        message: 'Erro ao atualizar conta.', err
                    });
                }
            });

            res.send({ 
                status: 'success', 
                message: 'Password Changed!', user
            });

        } else {
            return res.status(500).send({
                status: 'error',
                message: "Expired Token. "
            })
        }        
    }

    controller.findSelf = async (req, res) => {
        // get info from account
        let currentAccount = await Account.findOne({ _id: req.user.user_id })
                                            .then(data => { 
                                                if (data === null || !data) throw 'Conta não encontrada!';
                                                return data; 
                                            })
                                            .catch(err => {
                                                return res.status(500).send({
                                                    status: 'error',
                                                    message: "Erro ao procurar conta. ", err
                                                })
                                            })

        if (currentAccount.role === 'admin') {
            res.json({
                status: 'success',
                message: currentAccount
            })
        } else {
            res.json({
                status: 'success',
                message: {
                    role: currentAccount.role,
                    name: currentAccount.name, 
                    email: currentAccount.email,
                    phoneNumber: currentAccount.phoneNumber
                }
            });
        }
    }

    controller.updateCart = async (req, res) => {
        if (Object.keys(req.body).length === 0) {
            return res.status(400).send({
                status: 'invalid',
                message: "À espera de cartJson com items."
            });
        }

        Account.findByIdAndUpdate(req.user.user_id, { cart: JSON.stringify(req.body.cartJson) }, { useFindAndModify: false })
        .then(data => {
            if (data === null || !data) throw 'Conta não encontrada!';
            res.send({ 
                status: 'success',
                message: `Carrinho da conta '${data.name}' foi atualizada com sucesso!` 
            });
        })
        .catch(err => {
            return res.status(500).send({
                status: 'error',
                message: 'Erro ao atualizar carrinho da conta. ' + err
            });
        });
    }
  
    return controller;
}