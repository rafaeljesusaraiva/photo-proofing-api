const Photo = require("../models").photo;
const Album = require("../models").album;
const Order = require("../models").order;

const uploadFile = require("../middleware/file.upload");
const fs = require('fs');
const path = require("path")

module.exports = () => {
    const controller = {};
  
    controller.create = async (req, res) => {
        try {
            await uploadFile(req, res);

            let album = await Album.findOne({ _id: req.body.albumId }).then(albumObj => { return albumObj }).catch(err => { return err; });

            let reqWatermark = (req.body.watermark.toLowerCase() === 'true')

            // Final location folder
            let albumPath = `${__basedir}/public/${reqWatermark ? 'album_watermarked' : 'album_delivery'}/${album.slug}/`;

            // Check if Base Folders exist
            if (!fs.existsSync(`${__basedir}/public/album_delivery/`)) {
                fs.mkdirSync(`${__basedir}/public/album_delivery/`)
            }

            if (!fs.existsSync(`${__basedir}/public/album_watermarked/`)) {
                fs.mkdirSync(`${__basedir}/public/album_watermarked/`)
            }

            // Check if Final Location exists, if not create
            if (!fs.existsSync(albumPath)) {
                fs.mkdirSync(albumPath)
            }

            req.files.map(file => {
                let fileToMove = path.join(__basedir, '/public/temp_upload/', file.filename);
                let fileFinal = path.join(albumPath, file.filename)
                fs.rename(fileToMove, fileFinal, function (err) {
                    if (err) {
                        console.log(err);
                        throw false;
                    }
                });
            })
        
            let fileSize = (req.files.length) ? req.files.length : req.files.size;
            if (fileSize <= 0) {
                console.log('[Add Photo] You must select at least 1 file')
                return res.status(404).json({ 
                    message: 'error', 
                    info: 'You must select at least 1 file.',
                    details: null
                })
            }
        } catch (error) {
            req.files.map(file => {
                let fileToRemove = path.join(__basedir, '/public/temp_upload/', file.filename);
                try {
                    fs.unlinkSync(fileToRemove)
                } catch(err) {
                    console.error(err)
                }
            })
            if (error.code === "LIMIT_UNEXPECTED_FILE") {
                console.log('[Add Photo] Too many files to upload')
                return res.status(404).json({ 
                    message: 'error', 
                    info: 'Too many files to upload.',
                    details: error
                })
            }
            console.log('[Add Photo] Error uploading too many files', error)
            return res.status(404).json({ 
                message: 'error', 
                info: 'Error when trying upload many files.',
                details: error
            })
        }

        let uploadedFilesObj = [];
        let reqWatermark = (req.body.watermark.toLowerCase() === 'true')

        req.files.map(file => {
            uploadedFilesObj.push(
                new Photo({
                    filename: file.filename,
                    album: req.body.albumId
                })
            )
        })

        await Album.findOne({ _id: req.body.albumId }).then(albumObj => {
            if (!reqWatermark) {
                uploadedFilesObj.map(async singlePhoto => {
                    await albumObj.addImage(singlePhoto);
                    await singlePhoto.save(singlePhoto).catch(err => {
                        res.status(500).send({
                            message:
                            err.message || "Some error occurred while creating the photo in DB."
                        });
                    })
                })
            } else {
                uploadedFilesObj.map(async singlePhoto => {
                    await albumObj.addWatermarked(singlePhoto);
                    await singlePhoto.save(singlePhoto).catch(err => {
                        res.status(500).send({
                            message:
                            err.message || "Some error occurred while creating the photo in DB."
                        });
                    })
                })
            }
        });

        res.json({
            message: 'success'
        })
    };

    controller.findAll = async (req, res) => {
        // destructure page and limit and set default values
        const { page = 1, limit = 25 } = req.query;

        try {
            // execute query with page and limit values
            const photos = await Photo.find()
              .limit(limit * 1)
              .skip((page - 1) * limit)
              .exec();
        
            // get total documents in the Posts collection 
            const count = await Photo.countDocuments();
        
            // return response with posts, total pages, and current page
            res.json({
                photos,
                totalPages: Math.ceil(count / limit),
                currentPage: page
            });
        } catch (err) {
            res.status(500).send({
                message:
                err.message || "Some error occurred while creating the photo."
            });
        }
    };

    controller.findAllOrdered = async (req, res) => {
        // get all id images from orders
        const clientOrders = await Order.find({ client: req.user.user_id }).populate('products').then(data => { return data })
        let imageIDs = [];
        clientOrders.forEach(singleOrder => {
            singleOrder.products.forEach(singleProduct => {
                imageIDs.push(singleProduct.item)
            });
        });
        
        // get all filenames and albums from photos
        let images = await Photo.find({
            '_id': { $in: imageIDs}
        }).populate('album').then(data => { return data })

        // ready a response
        let finalResponse = [];
        images.forEach(singleImage => {
            finalResponse.push({
                album: singleImage.album.title,
                filename: `/delivery/${singleImage.album.slug}/${singleImage.filename}`
            })
        })

        res.json(finalResponse)
    }

    controller.delete = async (req, res) => {
        const id = req.params.id;

        Photo.findByIdAndRemove(id)
        .then(data => {
            if (!data) {
                res.status(404).send({
                    message: `Cannot delete Photo with id=${id}. Maybe Photo was not found!`
                });
            } else {
                Album.findOne({ _id: data.album }).then(albumObj => {
                    albumObj.removeImage({_id: data.id});

                    let imgPath = __basedir + "/public/album";
                    if (albumObj.isImageOrWatermark(data._id) == 'image') {
                        imgPath += `_delivery/${albumObj.slug}/${data.filename}`;
                    } else if (albumObj.isImageOrWatermark(data._id) == 'watermark') {
                        imgPath += `_watermarked/${albumObj.slug}/${data.filename}`;
                    } else {
                        res.status(404).send({
                            message: `Error in image path for file removal!`,
                            debug: "Image Controller => DELETE"
                        });
                    }

                    try {
                        fs.unlinkSync(imgPath)
                        res.send({
                            message: "Photo was deleted successfully!"
                        });
                    } catch(err) {
                        console.error(err)
                    }
                });
            }
        })
        .catch(err => {
            res.status(500).send({
                message: "Could not delete Photo with id=" + id, err
            });
        });
    };
  
    return controller;
}