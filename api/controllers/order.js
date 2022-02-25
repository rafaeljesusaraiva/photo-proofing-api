const Order = require("../models").order;
// Dependencies
const Account = require("../models").account;
const Promotion = require("../models").promotion;
const Photo = require("../models").photo;
const PhotoSize = require("../models").photo_size;
var dayjs = require("dayjs");
const mail = require("../extra/mail");
const utils = require("../extra/utils");
const archiver = require("archiver");
const fs = require("fs");

module.exports = () => {
  const controller = {};

  controller.create = async (req, res) => {
    let { client, payment, items, promotion, note } = req.body;

    // Validate request
    if (!client) {
      res.status(400).send({ message: "Client cannot be empty!" });
      return;
    }

    // Check Client
    let validClient = await Account.findById(client).catch((err) => {
      return err;
    });
    if (!validClient) {
      res.status(400).send({ message: "Invalid Client!" });
      return;
    }

    // Check Promotion
    if (promotion) {
      let validPromotion = await Promotion.findOne({ code: promotion }).catch(
        (err) => {
          return err;
        }
      );
      if (!validPromotion) {
        res.status(400).send({ message: "Invalid Promotion!" });
        return;
      }
      promotion = validPromotion._id;
    }

    let products = [],
      orderTotal = 0;
    if (items !== undefined && items.length > 0) {
      for (var i = 0; i < items.length; i++) {
        // Check valid Photo
        let validPhoto = await Photo.findById(items[i].item).catch((err) => {
          return err;
        });
        if (!validPhoto) {
          res.status(400).send({
            message: `Invalid Photo [${i + 1}]!`,
          });
          return;
        }

        // Check valid Size
        let validSize = await PhotoSize.findById(items[i].size).catch((err) => {
          return err;
        });
        if (!validSize) {
          res.status(400).send({
            message: `Invalid Photo Size [${i + 1}]!`,
          });
          return;
        }

        orderTotal += validSize.price;

        products.push({
          item: items[i].item,
          size: items[i].size,
        });
      }
    }

    const newOrder = new Order({
      client: client,
      payment: payment ? payment : null,
      promotion: promotion ? promotion : null,
      totalNoPromotion: orderTotal,
      products: products,
      note: note ? note : null,
    });

    newOrder.orderCount = await Order.estimatedDocumentCount(
      {},
      function (err, result) {
        if (err) {
          console.log(err);
        } else {
          return result;
        }
      }
    );

    // return res.send({ status: 'success', message: newOrder })

    Promotion.findOneAndUpdate(
      { _id: promotion },
      { $inc: { remainingUses: -1 } },
      { useFindAndModify: false }
    ).exec();

    newOrder
      .save(newOrder)
      .then(async (data) => {
        await mail.sendEmail(
          validClient.email,
          `[Prova Fotografias] Nova Encomenda #${data.orderCount
            .toString()
            .padStart(4, "0")}`,
          `Nova encomenda efetuada. Pode consultar mais informações em: ${process.env.WEB_URL}/encomendas`
        );
        res.send({
          status: "success",
          message: data,
        });
      })
      .catch((err) => {
        res.status(500).send({
          message:
            err.message || "Some error occurred while creating the photo size.",
        });
      });
  };

  controller.findAll_client = async (req, res) => {
    Order.find({ client: req.user.user_id })
      .populate("promotion")
      .populate({
        path: "products",
        populate: {
          path: "item",
          populate: { path: "album" },
        },
      })
      .populate({
        path: "products",
        populate: { path: "size" },
      })
      .then((data) => {
        return res.send({
          status: "success",
          message: data.map(function (item) {
            let t_promotion = null;
            if (item.promotion) {
              if (item.promotion.percentage) {
                t_promotion = {
                  code: item.promotion.code,
                  discount: item.promotion.percentage,
                };
              } else {
                t_promotion = {
                  code: item.promotion.code,
                  value: item.promotion.value,
                };
              }
            }

            let t_products = item.products.map(function (item_product) {
              return {
                // FIX AFTER PHOTO DONE
                albumTitle: item_product.item.album.title,
                albumSlug: item_product.item.album.slug,
                item: item_product.item.filename,
                size: item_product.size.size,
                price: item_product.size.price,
              };
            });

            return {
              orderCount: item.orderCount,
              id: item.id,
              status: item.status,
              promotion: t_promotion,
              totalNoPromotion: item.totalNoPromotion,
              products: t_products,
              note: item.note,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
            };
          }),
        });
      })
      .catch((err) => {
        res.status(500).send({
          message:
            err.message || "Some error occurred while retrieving orders.",
        });
      });
  };

  controller.findAll_admin = async (req, res) => {
    Order.find()
      .populate("client")
      .populate("promotion")
      .populate("payment")
      .populate({
        path: "products",
        populate: {
          path: "item",
          populate: { path: "album" },
        },
      })
      .populate({
        path: "products",
        populate: { path: "size" },
      })
      .then((data) => {
        res.status(200).json({
          status: "success",
          message: data,
        });
      })
      .catch((err) => {
        res.status(500).send({
          message:
            err.message || "Some error occurred while retrieving orders.",
        });
      });
  };

  controller.findOne_admin = (req, res) => {
    const id = req.params.id;

    Order.findById(id)
      .populate("client")
      .populate("promotion")
      .populate("payment")
      .populate({
        path: "products",
        populate: {
          path: "item",
          populate: { path: "album" },
        },
      })
      .populate({
        path: "products",
        populate: { path: "size" },
      })
      .then((data) => {
        res.status(200).json({
          status: "success",
          message: data,
        });
      })
      .catch((err) => {
        res.status(500).send({
          message:
            err.message || "Some error occurred while retrieving orders.",
        });
      });
  };

  controller.stats_admin = async (req, res) => {
    const orders = await Order.find({
      status: { $nin: ["Cancelada", "Entregue"] },
    })
      .populate("client")
      .populate("promotion")
      .populate({
        path: "products",
        populate: { path: "size" },
      })
      .sort({ createdAt: "asc" });
    if (!orders) {
      return res.status(404).json({
        status: "error",
        message: "Could not retrieve orders",
      });
    }

    const photoSizes = await PhotoSize.find();
    if (!photoSizes) {
      return res.status(404).json({
        status: "error",
        message: "Could not retrieve photoSizes",
      });
    }
    let simpleSizes = {};
    photoSizes.forEach((singleSize) => {
      let costs = {},
        costList = singleSize.costVariations;
      costList.forEach((singleCost) => {
        costs[singleCost.minimumQuantity] = singleCost.price;
      });
      simpleSizes[singleSize.size] = costs;
    });

    // Total Encomendas (int)
    let orderCount = orders.length;

    // Total Vendas € (int)
    let sumSales = 0;
    orders.forEach((order) => {
      sumSales +=
        order.totalNoPromotion -
        (order.promotion
          ? order.promotion.value
            ? order.promotion.value
            : order.totalNoPromotion * order.promotion.percentage
          : 0);
    });

    // Total Despesa € (int)
    let sumExpenses = 0;
    let requestedSizes = {}; // "size": total
    orders.forEach((order) => {
      let tproducts = order.products;
      tproducts.forEach((singleProduct) => {
        if (singleProduct.size.size in requestedSizes) {
          requestedSizes[singleProduct.size.size] += 1;
        } else {
          requestedSizes[singleProduct.size.size] = 1;
        }
      });
    });
    // Percorrer Tamanhos Comprados
    for (var sizeKey in requestedSizes) {
      if (sizeKey === "length" || !requestedSizes.hasOwnProperty(sizeKey))
        continue;
      var quantity = requestedSizes[sizeKey];

      // sizeKey => nome tamanho pedido
      // quantity => quantidade tamanho pedido

      let matchedSize = simpleSizes[sizeKey],
        priceToPay = 0;
      // matchedSize => objeto com info do tamanho pedido
      // qtyObj => objeto com info do custo real

      for (var msQty in matchedSize) {
        if (msQty === "length" || !matchedSize.hasOwnProperty(msQty)) continue;
        var msPrice = matchedSize[msQty];
        // msQty => numero de quantidade minima
        // msPrice => custo de quantidade minima

        if (quantity > parseInt(msQty)) {
          priceToPay = msPrice;
        } else {
          break;
        }
      }

      sumExpenses += quantity * priceToPay;
    }

    // Últimas Encomendas (5)
    let lastFiveOrders = [];
    orders.reverse().forEach((order) => {
      if (lastFiveOrders.length < 5) {
        lastFiveOrders.push(order);
      }
    });

    res.status(200).json({
      status: "success",
      message: {
        orderCount: orderCount,
        sumSales: Number(sumSales).toFixed(2) + " €",
        sumExpenses: Number(sumExpenses).toFixed(2) + " €",
        lastOrders: lastFiveOrders,
      },
    });
  };

  controller.update = async (req, res) => {
    const allowedFieldsStr =
      "Allowed fields: note (string), promotionCode (string), addProducts (array), remProducts (array) and orderStatus (string => 'Recebida - Por Pagar', 'Paga', 'A Processar', 'Em Entrega', 'Entregue').";

    // Check if not receiving empty request
    if (Object.keys(req.body).length === 0) {
      return res.status(400).send({
        message: "Data to update can not be empty! " + allowedFieldsStr,
      });
    }

    // Check if receiving only required fields
    if (
      req.body.remProducts === undefined &&
      req.body.addProducts === undefined &&
      req.body.orderStatus === undefined &&
      req.body.promotionCode === undefined &&
      req.body.note === undefined
    ) {
      return res.status(400).send({
        message: "Invalid Fields! " + allowedFieldsStr,
      });
    }

    const id = req.params.id;
    let currentOrder = await Order.findById(id)
      .populate("client")
      .then((data) => {
        if (data === null) throw "not found";
        return data;
      })
      .catch((err) => {
        res.status(500).send({
          message: "Error updating Order with id=" + id,
          debug: err,
        });
      });

    if (currentOrder === null) return;

    if (req.body.addProducts) {
      // check if receiving array
      if (req.body.addProducts instanceof Array) {
        for (const newProduct of req.body.addProducts) {
          // check if valid image
          let newProductFound = await Photo.find({ _id: newProduct.imageID })
            .then((data) => {
              if (data == null) throw "Photo Not found. " + newProduct.imageID;
              return data;
            })
            .catch((err) => {
              res.status(500).send({
                message: "Error updating Order with id=" + id,
                debug: err,
              });
            });
          if (newProductFound === null) return false;
          // check if valid size
          let newSizeFound = await PhotoSize.find({ _id: newProduct.sizeID })
            .then((data) => {
              if (data == null) throw "Size Not found. " + newProduct.sizeID;
              return data;
            })
            .catch((err) => {
              res.status(500).send({
                message: "Error updating Order with id=" + id,
                debug: err,
              });
            });
          if (newSizeFound === null) return false;
          // add images to order
          currentOrder.addProduct({
            item: newProductFound._id,
            size: newSizeFound._id,
          });
        }
      } else {
        res.status(500).send({
          message: "Error updating Order with id=" + id,
          debug: "Invalid addition of products, need to receive array of ids",
        });
      }
    }
    if (req.body.remProducts) {
      // check if receiving array
      if (req.body.remProducts instanceof Array) {
        for (const newProduct of req.body.remProducts) {
          // check if valid image
          let newProductFound = await Photo.find({ _id: newProduct.imageID })
            .then((data) => {
              if (data == null) throw "Photo Not found. " + newProduct.imageID;
              return data;
            })
            .catch((err) => {
              res.status(500).send({
                message: "Error updating Order with id=" + id,
                debug: err,
              });
            });
          if (newProductFound === null) return false;
          // add images to order
          currentOrder.remProduct(newProductFound._id);
        }
      } else {
        res.status(500).send({
          message: "Error updating Order with id=" + id,
          debug: "Invalid removal of products, need to receive array of ids",
        });
      }
    }
    if (
      req.body.orderStatus &&
      currentOrder.isValidStatus(req.body.orderStatus)
    ) {
      currentOrder.updateStatus(req.body.orderStatus);
      await mail.sendEmail(
        currentOrder.client.email,
        `[Prova Fotografias] Atualização Encomenda #${currentOrder.orderCount
          .toString()
          .padStart(4, "0")}`,
        `A sua encomenda #${currentOrder.orderCount
          .toString()
          .padStart(4, "0")} mudou para "${
          req.body.orderStatus
        }". Pode consultar mais informações em: ${
          process.env.WEB_URL
        }/encomendas`
      );
    }
    if (req.body.promotionCode) {
      let newPromo = await Promotion.findOne({ code: req.body.promotionCode })
        .then((data) => {
          if (data.length === 0) throw "Not found!";
          return data;
        })
        .catch((err) => {
          res.status(500).send({
            message: "Error getting promotion",
            debug: err,
          });
        });
      if (newPromo !== null && newPromo._id !== currentOrder.promotion) {
        currentOrder.promotion = newPromo._id;
        newPromo.remainingUses = newPromo.remainingUses - 1;
        await newPromo.save();
      }
    }
    if (req.body.note) {
      currentOrder.note = req.body.note;
    }

    await currentOrder.save();

    res.json({
      message: "success",
    });
  };

  controller.delete = (req, res) => {
    const id = req.params.id;

    Order.findByIdAndRemove(id)
      .then((data) => {
        if (!data) {
          res.status(404).send({
            message: `Cannot delete Order with id=${id}. Maybe Order was not found!`,
          });
        } else {
          res.send({
            message: "Order was deleted successfully!",
          });
        }
      })
      .catch((err) => {
        res.status(500).send({
          message: "Could not delete Order with id=" + id,
        });
      });
  };

  controller.process_orders = async (req, res) => {
    // Get All Orders
    const orders = await Order.find({
      status: { $nin: ["Cancelada", "Em Entrega", "Entregue"] },
    })
      .populate("client")
      .populate("promotion")
      .populate("payment")
      .populate({
        path: "products",
        populate: {
          path: "item",
          populate: {
            path: "album",
            select: "title slug",
            populate: {
              path: "images watermarked",
            },
          },
        },
      })
      .populate("products.size", "size");

    let processedInfo = await utils.processDataToExcel(orders);
    let OrderList = processedInfo.OrderList;
    let PrintList = processedInfo.PrintList;
    let PrintTotal = processedInfo.PrintTotal;

    const photoSizes = await PhotoSize.find();
    if (!photoSizes) {
      return res.status(404).json({
        status: "error",
        message: "Could not retrieve photoSizes",
      });
    }
    let simpleSizes = {};
    photoSizes.forEach((singleSize) => {
      let costs = {},
        costList = singleSize.costVariations;
      costList.forEach((singleCost) => {
        costs[singleCost.minimumQuantity] = singleCost.price;
      });
      simpleSizes[singleSize.size] = costs;
    });

    await utils.generateProcessingExcel(
      OrderList,
      PrintList,
      PrintTotal,
      simpleSizes
    );

    async function waitForWrite() {
      let filesize = (
        await fs.promises.stat(
          `${__basedir}/public/temp_upload/Relatorio-Encomendas.xlsx`
        )
      ).size;
      if (filesize < 100) {
        setTimeout(waitForWrite, 250);
      }
    }
    waitForWrite();

    const excelFileName = `resumo_encomendas_porProcessar_${dayjs().format(
      "YYYY_MMM_DD-HH_mm_ss"
    )}.xlsx`;
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=" + excelFileName
    );
    return res.sendFile(
      `${__basedir}/public/temp_upload/Relatorio-Encomendas.xlsx`,
      function (err) {
        if (err) {
          next(err);
        }
      }
    );
  };

  controller.process_orders_zip = async (req, res) => {
    // Get All Orders
    const orders = await Order.find({
      status: { $nin: ["Cancelada", "Em Entrega", "Entregue"] },
    })
      .populate("client")
      .populate("promotion")
      .populate("payment")
      .populate({
        path: "products",
        populate: {
          path: "item",
          populate: {
            path: "album",
            select: "title slug",
            populate: {
              path: "images watermarked",
            },
          },
        },
      })
      .populate("products.size", "size");

    let processedInfo = await utils.processDataToExcel(orders);
    let OrderList = processedInfo.OrderList;
    let PrintList = processedInfo.PrintList;
    let PrintTotal = processedInfo.PrintTotal;

    const photoSizes = await PhotoSize.find();
    if (!photoSizes) {
      return res.status(404).json({
        status: "error",
        message: "Could not retrieve photoSizes",
      });
    }
    let simpleSizes = {};
    photoSizes.forEach((singleSize) => {
      let costs = {},
        costList = singleSize.costVariations;
      costList.forEach((singleCost) => {
        costs[singleCost.minimumQuantity] = singleCost.price;
      });
      simpleSizes[singleSize.size] = costs;
    });

    await utils.generateProcessingExcel(
      OrderList,
      PrintList,
      PrintTotal,
      simpleSizes
    );

    async function waitForWrite() {
      let filesize = (
        await fs.promises.stat(
          `${__basedir}/public/temp_upload/Relatorio-Encomendas.xlsx`
        )
      ).size;
      if (filesize < 100) {
        setTimeout(waitForWrite, 250);
      }
    }
    waitForWrite();

    const archive = archiver("zip", { zlib: { level: 9 } });
    res.attachment(
      `resumo_encomendas_porProcessar_${dayjs().format(
        "YYYY_MMM_DD-HH_mm_ss"
      )}.zip`
    );
    archive.pipe(res);

    PrintList.forEach((printing) => {
      let filepath = `${__basedir}/public/album_delivery/${printing.album_slug}/${printing.filename}`;
      for (let repeat = 0; repeat < printing.quantity; repeat++) {
        archive.file(filepath, {
          name: "/fotografias_imprimir/" + repeat + "_" + printing.filename,
        });
      }
    });
    archive.append(
      fs.createReadStream(
        `${__basedir}/public/temp_upload/Relatorio-Encomendas.xlsx`
      ),
      { name: "Relatorio-Encomendas.xlsx" }
    );

    archive.finalize();
    return;
  };

  return controller;
};
