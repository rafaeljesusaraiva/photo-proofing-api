const Album = require("../models").album;
const Photo = require("../models").photo;

const fs = require('fs');
const path = require("path");
const uploadFile = require("../middleware/file.upload");
const dayjs = require("dayjs")

function dateForMongoose(str) {
    var parms = str.split(/[\.\-\/]/);
    var yyyy = parseInt(parms[2],10);
    var mm   = parseInt(parms[1],10);
    var dd   = parseInt(parms[0],10);
    return yyyy+'-'+mm+'-'+dd;
}

function processDate(strDate, type) {
    if (!dayjs(strDate).isValid() || strDate === undefined) {
        return false;
    } else {
        return dateForMongoose(dayjs(strDate).format('DD-MM-YYYY'));
    }
}

module.exports = () => {
    const controller = {};
  
    controller.create = async (req, res) => {
        try {
            await uploadFile(req, res);

            let fileSize = (req.files.length) ? req.files.length : req.files.size;
            if (fileSize <= 0) {
                return res.status(404).json({ 
                    status: 'error', 
                    message: "Pelo menos um ficheiro deve ser carregado. (Campo 'images')"
                })
            }
        } catch (error) {
            req.files.map(file => {
                let fileToRemove = path.join(__basedir, '/public/temp_upload/', file.filename);
                try {
                    fs.unlinkSync(fileToRemove)
                } catch(err) {
                    return res.status(404).json({ 
                        status: 'error', 
                        message: "Erro ao apagar imagem. " + err
                    })
                }
            })
            if (error.code === "LIMIT_UNEXPECTED_FILE") {
                return res.status(404).json({ 
                    status: 'error', 
                    message: 'Ficheiro de formato inesperado. ' + error
                })
            }
            return res.status(404).json({ 
                status: 'error', 
                message: 'Limite de ficheiros a carregar ultrapassado (2000 ficheiros).' + error
            })
        }
        const { title, date_event, date_available, date_finalOrder, slug } = req.body;

        // Validate request
        if (!title || !slug || title === '' || slug === '') {
            return res.status(400).send({
                status: 'invalid',
                message: "Pedido à espera de 'title' e 'slug' (opcional 'date_event', 'date_available', 'date_finalOrder')."
            });
        }

        let tdate_event = processDate(date_event, 'event'), 
            tdate_available = processDate(date_available, 'available'), 
            tdate_finalOrder = processDate(date_finalOrder, 'finalOrder');

        if (tdate_event === false || tdate_available === false || tdate_finalOrder === false) {
            return res.status(400).send({ 
                status: 'invalid',
                message: `Data tem o formato inválido! Formato correto DD-MM-AAAA. ${tdate_event} ${tdate_available} ${tdate_finalOrder}` 
            });
        }

        const newAlbum = new Album({
            title: title,
            date_event: tdate_event,
            date_available: tdate_available,
            date_finalOrder: tdate_finalOrder,
            slug: slug
        });

        newAlbum.save(newAlbum).then(data => { 
            // Final location folder for cover image
            let albumPath = __basedir + "/public/album_cover/";
            // Check if Final Location exists, if not create
            if (!fs.existsSync(albumPath)) {
                fs.mkdirSync(albumPath)
            }

            let fileToMove = path.join(__basedir, '/public/temp_upload/', req.files[0].filename);
            let fileFinal = path.join(albumPath, data.slug+'.jpg')
            fs.rename(fileToMove, fileFinal, function (err) {
                if (err) {
                    throw 'File Renaming - '+err;
                }
            });

            data.cover = "/public/cover/" + data.slug + '.jpg'
            data.save(data).then(data => {
                return res.send({
                    status: 'success',
                    message: data
                });
            }).catch(err => {
                return res.status(500).send({
                    status: 'error',
                    message: "Erro ao guardar 'cover' após inserir álbum. " + err
                })
            })
        }).catch(err => {
            return res.status(500).send({
                status: 'error',
                message: 'Um erro ocorreu ao processar o pedido. ' + err
            });
        });
    };

    controller.findAll_client = (req, res) => {
        Album.find({})
        .populate('watermarked')
        .then(data => { 
            res.send({
                status: 'success',
                message: data.map(function(item){
                            let t_images = item.watermarked.map(function(image) {
                                return {
                                    id: image.id,
                                    imagePath: `/public/album/${item.slug}/${image.filename}`
                                }
                            })

                            return {
                                title : item.title, 
                                cover : item.cover,
                                totalImages: item.totalImages,
                                date_event: item.date_event ? new Date(item.date_event).toLocaleDateString('pt') : null,
                                date_available: item.date_available ? new Date(item.date_available).toLocaleDateString('pt') : null,
                                date_finalOrder: item.date_finalOrder ? new Date(item.date_finalOrder).toLocaleDateString('pt') : null,
                                slug: item.slug,
                                images: t_images
                            }
                })
            }); 
        })
        .catch(err => {
            return res.status(500).send({
                status: 'error',
                message: 'Erro ao procurar albuns => ' + err
            });
        });
    };

    controller.findAll_admin = (req, res) => {
        Album.find({})
        .lean()
        .populate('images')
        .populate('watermarked')
        .then(data => { 
            data.forEach(item => {
                item.watermarked = item.watermarked.map(image => ({ ...image, filepath: `/public/album/${item.slug}/${image.filename}` }))
                item.images = item.images.map(image => ({ ...image, filepath: `/public/album_delivery/${item._id}/${image.filename}` }))
            })
            res.send({
                status: 'success',
                message: data
            }); 
        })
        .catch(err => {
            return res.status(500).send({
                status: 'error',
                message: 'Erro ao procurar álbuns => ' + err
            });
        });
    };

    controller.findOne_admin = (req, res) => {
        const album_id = req.params.id;

        Album.findById(album_id)
        .lean()
        .populate('images')
        .populate('watermarked')
        .then(data => { 
            data.watermarked = data.watermarked.map(image => ({ ...image, filepath: `/public/album/${data.slug}/${image.filename}` }))
            data.images = data.images.map(image => ({ ...image, filepath: `/public/album_delivery/${data._id}/${image.filename}` }))
            res.send({
                status: 'success',
                message: data
            }); 
        })
        .catch(err => {
            return res.status(500).send({
                status: 'error',
                message: 'Erro ao procurar álbuns => ' + err
            });
        });
    };

    controller.update = async (req, res) => {
        const album_id = req.params.id;

        if (Object.keys(req.body).length === 0) {
            return res.status(400).send({
                status: 'invalid',
                message: "À espera de pelo menos um campo para atualizar álbum! (date_event, date_available, date_finalOrder)"
            });
        }

        const { date_event, date_available, date_finalOrder } = req.body;
        let to_update = {};

        if (date_event !== undefined && isDate(date_event)) {
            to_update.date_event = new Date(date_event)
        }
        if (date_available !== undefined && isDate(date_available)) {
            to_update.date_available = new Date(date_available)
        }
        if (date_finalOrder !== undefined && isDate(date_finalOrder)) {
            to_update.date_finalOrder = new Date(date_finalOrder)
        }

        // check album and change date_event or date_available or date_finalOrder
        let album = await Album.findOneAndUpdate({ _id: album_id }, { $set: to_update },{ useFindAndModify: false, new: true })
                                .then(data => { 
                                    if (data === null || !data) throw 'Album not found!'; 
                                    return data; 
                                })
                                .catch(err => {
                                    return res.status(500).send({
                                        status: 'error',
                                        message: 'Erro ao atualizar album. ' + err
                                    });
                                })
        
        res.send({
            status: "success",
            message: album
        })
    };

    controller.delete = (req, res) => {
        const id = req.params.id;

        Album.findByIdAndRemove(id)
        .then(data => {
            if (data === null || !data) throw 'Album not found!'; 
                
            // remove images
            let imgPath = __basedir + "/public/albums/";

            data.images.map(function (image) {
                Photo.findByIdAndRemove(image).then(img => {
                    try {
                        fs.unlinkSync(imgPath + data._id + "/" + img.filename)
                    } catch(err) {
                        return res.status(500).send({
                            status: 'error',
                            message: "Erro ao apagar álbum. (Processo de eliminar imagens)", err
                        })
                    }
                }).catch(err => {
                    return res.status(500).send({
                        status: 'error',
                        message: "Não é possível apagar imagem com id=" + image + " | " + err
                    });
                })
            })

            data.watermarked.map(function (image) {
                Photo.findByIdAndRemove(image).then(img => {
                    try {
                        fs.unlinkSync(imgPath + data.slug + "/" + img.filename)
                    } catch(err) {
                        return res.status(500).send({
                            status: 'error',
                            message: "Erro ao apagar álbum. (Processo de eliminar imagens com marca)", err
                        })
                    }
                }).catch(err => {
                    return res.status(500).send({
                        status: 'error',
                        message: "Não é possível apagar imagem com marca com id=" + image + " | " + err
                    });
                })
            })

            // remove folders
            fs.rmdir(imgPath + data.slug, function(err) {
                if (err) {
                    throw err
                }
            })
            fs.rmdir(imgPath + data._id, function(err) {
                if (err) {
                    throw err
                }
            })

            res.send({
                status: 'success',
                message: 'Álbum apagado com sucesso!'
            });
        })
        .catch(err => {
            return res.status(500).send({
                status: 'error',
                message: "Erro ao apagar álbum. ", err
            })
        });
    };
  
    return controller;
}