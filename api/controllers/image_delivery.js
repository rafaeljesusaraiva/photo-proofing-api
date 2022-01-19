const db = require("../models");
const Account = db.account;
const Album = db.album;
const Order = db.order;

const util = require('util')
const archiver = require('archiver');

module.exports = () => {
    const controller = {};
  
    controller.deliverImage = async (req, res) => {
        // /:slug/:image
        const params = req.params;

        if (req.headers["order-id"] === undefined) {
            res.status(400).send({ 
                status: 'error',
                message: "Falta header order-id"
            })
        }

        let user_id = req.user.user_id;
        let gotUser = await Account.findOne({ _id: user_id });

        // verify album slug
        let album = await Album.findOne({ slug: params.slug })
            .populate('images')
            .populate('watermarked')
            .then(foundAlbum => {
                if (foundAlbum === null) throw 'Álbum não encontrado.';
                return foundAlbum;
            })
            .catch(err => res.status(400).send({ 
                status: 'error',
                message: "Erro ao procurar álbum com a slug indicada!", err 
            }))

        // check if image in album
        let foundImageInAlbum = false;
        try {
            for (let imageIndex = 0; imageIndex < album.watermarked.length; imageIndex++) {
                const image = album.watermarked[imageIndex];
                if (image.filename === params.image){
                    foundImageInAlbum = { watermark: image, image: album.images[imageIndex] };
                    break;
                }
            }
            if (!foundImageInAlbum) throw 'Imagem não encontrada.'
        } catch (error) {
            res.status(400).send({ 
                status: 'error',
                message: "Erro ao encontrar imagem com o nome indicado!", error 
            })
        }

        let foundOrder = null;

        if (!gotUser.isAdmin()) {
            // check if is bought (digital or physical)
            foundOrder = await Order.findOne({ _id: req.headers["order-id"], client: user_id })
                                    .populate({ path : 'products.item', populate : { path : 'item' } })
                                    .then(response => {
                                        if (response === null) {
                                            throw 'Nenhuma encomenda realizada com a imagem pedida.';
                                        }
                                        let titem = false, responseProducts = response.products;
                                        // loop products from order and check if matches with requested image
                                        // summing up, if user ordered the image
                                        responseProducts.forEach(element => {
                                            if (element.item.equals(foundImageInAlbum.watermark)) 
                                                titem = true;
                                        });
                                        if (titem === false) {
                                            throw 'Nenhuma encomenda realizada com a imagem pedida.';
                                        }
                                        return response;
                                    })
                                    .catch(err => {
                                        return res.status(400).send({ 
                                            status: 'error',
                                            message: "Erro ao procurar imagem nos pedidos do cliente!", err 
                                        });
                                    })
            if (foundOrder === null) return;
        }

        // send response
        if (gotUser.isAdmin() || foundOrder.canDeliverDigital()) {
            res.sendFile(`${__basedir}/public/album_delivery/${album.slug}/${foundImageInAlbum.image.filename}`)
        } else {
            res.status(400).send({ 
                status: 'error',
                message: "Cliente não adquiriu a imagem pedida!"
            })
        }
    };

    controller.deliverOrderZipped = async (req, res) => {
        // /:orderID
        const orderID = req.params.orderID;

        if (orderID === undefined) {
            res.status(400).send({ 
                status: 'error',
                message: "Falta /:orderID", err 
            })
        }

        let user_id = req.user.user_id;
        let gotUser = await Account.findOne({ _id: user_id });

        let orderQueryCondition = (gotUser.isAdmin()) ? { _id: orderID } : { _id: orderID, client: user_id }

        let order = await Order.findOne(orderQueryCondition)
                                .populate({ 
                                    path : 'products', 
                                    populate : { 
                                        path : 'item',
                                        populate: { 
                                            path: 'album',
                                            populate: {
                                                path: 'images watermarked'
                                            }
                                        }
                                    } 
                                })
                                .populate({ 
                                    path : 'products', 
                                    populate : { path : 'size' } 
                                })
                                .then(response => {
                                    if (response === null) throw 'Nenhuma encomenda realizada com a imagem pedida.';
                                    return response;
                                })
                                .catch(err => {
                                    return res.status(400).send({ 
                                        status: 'error',
                                        message: "Erro ao procurar imagem nos pedidos do cliente!", err 
                                    });
                                })

        // console.log(util.inspect(order, false, null, true))

        // Simplificar lista de produtos
        let productList = [], oldProdList = order.products;
        oldProdList.forEach(element => {
            if (productList.length === 0 || productList.every((prod) => { return ((prod.item._id).toString() === (element.item._id).toString()) ? false : true })) {
                productList.push(element);
            }
        })

        let tempList = [];
        let tCount = 0;
        productList.forEach(product => {
            let tAlbum = product.item.album;
            tCount += 1;
            let albumList = {
                watermarked: product.item.album.watermarked,
                original: product.item.album.images
            }
            let noWatermarkImage = "";
            for (let imageIndex = 0; imageIndex < albumList.watermarked.length; imageIndex++) {
                const image = albumList.watermarked[imageIndex];
                if (image.filename === product.item.filename){
                    noWatermarkImage = albumList.original[imageIndex];
                    break;
                }
            }
            tempList.push({
                name: `encomenda${order.orderCount.toString().padStart(4, '0')}-${product.item.album.slug.replace(/-/g, "_")}-${tCount.toString().padStart(4, '0')}.jpg`,
                dir: `${__basedir}/public/album_delivery/${tAlbum.slug}/${noWatermarkImage.filename}`
            });
        })

        // console.log(tempList)

        const archive = archiver('zip', { zlib: { level: 9 } });

        tempList.forEach(product => {
            archive.file(product.dir, { name: product.name });
        })

        res.attachment('order.zip').type('zip');
        archive.on('end', () => res.end());
        archive.pipe(res);
        archive.finalize();

        return;
    }
  
    return controller;
}