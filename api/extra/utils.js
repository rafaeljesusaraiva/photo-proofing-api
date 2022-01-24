const fs = require('fs');
var xl = require('excel4node');

module.exports = {
    condense_photoList: function (array) {
        let newArray = [], tSingleProduct = {};

        for (const [index, element] of array.entries()) {
            // Percorrer a lista de fotos

            let albumObj = element.item.album;
            let watermarkImage = element.item.filename;
            let noWatermarkImage = "";
            let sizeName = element.size.size;

            for (let imageIndex = 0; imageIndex < albumObj.watermarked.length; imageIndex++) {
                const image = albumObj.watermarked[imageIndex];
                if (image.filename === watermarkImage){
                    noWatermarkImage = albumObj.images[imageIndex].filename;
                    break;
                }
            }

            // Se primeira foto, guardar em objeto temporário
            if (index === 0) {
                tSingleProduct = {
                    album: albumObj.title,
                    album_slug: albumObj.slug,
                    filename: noWatermarkImage,
                    watermark: watermarkImage,
                    size: sizeName,
                    quantity: 1
                }
            } else {
                // Comparar com objeto temporário
                // Se igual, incrementar
                if (albumObj.slug === tSingleProduct.album_slug && watermarkImage === tSingleProduct.watermark && sizeName === tSingleProduct.size) {
                    tSingleProduct.quantity++;
                }
                // Se diferente, adicionar temporarío a array e substituir
                else {
                    newArray.push(tSingleProduct);

                    tSingleProduct = {
                        album: albumObj.title,
                        album_slug: albumObj.slug,
                        filename: noWatermarkImage,
                        watermark: watermarkImage,
                        size: sizeName,
                        quantity: 1
                    }
                }
            }
            
            // Caso seja último elemento do input, adicionar temporario a array
            if (index === array.length - 1) {
                newArray.push(tSingleProduct);
            }
        }

        return newArray;
    },
    condense_orderList: async function (array) {
        let newArray = [];

        // [{ cliente: $string, tel: $integer, email: $string, items: [{ album: $string, filename: $string, quantity: $integer }, ...] }, ...]
        for (const [index, order] of array.entries()) {
            newArray.push({
                orderNumber: order.orderCount.toString().padStart(4, '0'),
                client: order.client.name,
                tel: order.client.phoneNumber === 0 ? '------' : order.client.phoneNumber,
                email: order.client.email,
                state: order.status,
                orderCost: order.totalNoPromotion.toFixed(2),
                orderPromotion: order.promotion ? order.promotion : 'Nenhuma',
                totalItems: order.products.length,
                note: order.note === null ? "Nenhuma nota" : order.note.toString(),
                items: this.condense_photoList(order.products)
            })
        }

        return newArray;
    },
    // Returns false if does not exist or printList index of matching photo
    existsIn_printList: function (printList, photo) {
        for (const [index, printPhoto] of printList.entries()) {
            if (printPhoto.album === photo.album && printPhoto.filename === photo.filename && printPhoto.size === photo.size) {
                return index;
            }
        }
        return false;
    },
    // returns a promise which resolves true if file exists:
    checkFileExists: function (filepath){
        return new Promise((resolve, reject) => {
            fs.access(filepath, fs.constants.F_OK, error => {
                resolve(!error);
            });
        });
    },
    processDataToExcel: async function (orders){
        // Get List of Orders [{ cliente: $string, tel: $integer, email: $string, items: [{ album: $string, filename: $string, quantity: $integer }, ...] }, ...]
        let OrderList = [];

        // Get List of Photos to Print [{ album: $string, filename: $string, quantity: $integer }, ...]
        let PrintList = [];
        let PrintTotal = 0;

        // Filter out orders already fullfilled
        for (let orderIndex=0; orderIndex < orders.length; orderIndex++) {
            if (orders[orderIndex].status !== 'Recebida' && orders[orderIndex].status !== 'Paga' && orders[orderIndex].status !== 'A Processar')
                orders.splice(orderIndex, 1);
        }

        for (const singleOrder of orders) {
            //
            // Fill PrintList
            //
            // Function to condense 'currentOrder_photoList' into array with photo info and quantity
            const currentOrder_photoList = this.condense_photoList(singleOrder.products);

            // Go through 'currentOrder_photoList'
            for (const singlePhoto of currentOrder_photoList) {
                // Check if images exists, if not add to 'PrintList', else increase quantity count
                let exists = this.existsIn_printList(PrintList, singlePhoto);
                if (exists === false) {
                    PrintList.push(singlePhoto)
                } else {
                    PrintList[exists].quantity += singlePhoto.quantity;
                }
                PrintTotal += singlePhoto.quantity;
            }

            //
            // Sort PrintList
            //
            PrintList.sort((elementA, elementB)=>{
                return elementA.filename.toString().localeCompare(elementB.filename)
            })
        }

        //
        // Fill OrderList
        //
        OrderList = await this.condense_orderList(orders);

        return {
            OrderList: OrderList,
            PrintList: PrintList,
            PrintTotal: PrintTotal
        }
    },
    generateProcessingExcel: async function (OrderList, PrintList, PrintTotal){
        // Create Excel File
        var OrderSummary = new xl.Workbook({
            author: 'Aplicação de Provas - Rafael de Jesus Saraiva',
            jszip: {
                compression: 'DEFLATE',
            },
        });

        // Add Two Worksheets
        var PrintingSheet = OrderSummary.addWorksheet('Lista Impressões');
        var OrderSheet = OrderSummary.addWorksheet('Lista Encomendas');

        // Cell Styles
        var TitleStyle = OrderSummary.createStyle({ font: { color: '#000000', size: 24 } });
        var HeaderStyle1 = OrderSummary.createStyle({
            font: { color: '#000000', size: 18, bold: true },
            alignment: { wrapText: true, shrinkToFit: true }
        });
        var HeaderStyle2 = OrderSummary.createStyle({
            font: { color: '#000000', size: 12, bold: true },
            alignment: { wrapText: true, shrinkToFit: true }
        });
        var CellStyle = OrderSummary.createStyle({
            font: { color: '#000000', size: 12 },
            alignment: { wrapText: true, shrinkToFit: true, horizontal: 'left' }
        });

        //
        // Add Data to First Worksheet
        //
        // Worksheet Title
        PrintingSheet.cell(1, 1, 1, 6, true)
                        .string('Lista Fotografias a Imprimir - Total: ' + PrintTotal)
                        .style(TitleStyle);

        // Worksheet Table Headers
        PrintingSheet.cell(3, 1).string('Evento').style(HeaderStyle2);
        PrintingSheet.cell(3, 2).string('Nome Ficheiro').style(HeaderStyle2);
        PrintingSheet.cell(3, 3).string('Tamanho').style(HeaderStyle2);
        PrintingSheet.cell(3, 4).string('Quantidade').style(HeaderStyle2);
        PrintingSheet.column(1).setWidth(35);
        PrintingSheet.column(2).setWidth(53);
        PrintingSheet.column(3).setWidth(15);
        PrintingSheet.column(4).setWidth(15);

        // Worksheet Data
        for (let printIndex = 0, printRow = 4; printIndex < PrintList.length; printIndex++, printRow++) {
            PrintingSheet.cell(printRow, 1).style(CellStyle).string(PrintList[printIndex].album);
            PrintingSheet.cell(printRow, 2).style(CellStyle).string(PrintList[printIndex].filename);
            PrintingSheet.cell(printRow, 3).style(CellStyle).string(PrintList[printIndex].size);
            PrintingSheet.cell(printRow, 4).style(CellStyle).number(PrintList[printIndex].quantity);
        }

        //
        // Add Data to First Worksheet
        //
        // Worksheet Title
        OrderSheet.cell(1, 1, 1, 5, true)
                    .string('Lista Encomendas a Processar - Total: ' + OrderList.length)
                    .style(TitleStyle);

        // Worksheet Table Headers
        OrderSheet.column(1).setWidth(20);
        OrderSheet.column(2).setWidth(30);
        OrderSheet.column(3).setWidth(55);
        OrderSheet.column(4).setWidth(15);
        OrderSheet.column(5).setWidth(15);

        // Worksheet Data
        printRow = 3;
        for (let printIndex = 0, printRow = 3; printIndex < OrderList.length; printIndex++, printRow++) {
            // ws.cell(startRow, startColumn, [[endRow, endColumn], isMerged]);
            OrderSheet.cell(printRow, 1, printRow, 3, true)
                    .string('Encomenda #' + OrderList[printIndex].orderNumber + ': ' + OrderList[printIndex].state)
                    .style(HeaderStyle1);
            
            // Client & Order Info
            printRow++;
            OrderSheet.cell(printRow, 1).style(HeaderStyle2).string('Cliente');
            OrderSheet.cell(printRow, 2).style(CellStyle).string(OrderList[printIndex].client);
            printRow++;
            OrderSheet.cell(printRow, 1).style(HeaderStyle2).string('Telemóvel');
            if (OrderList[printIndex].tel.toString() === '------'){
                OrderSheet.cell(printRow, 2).style(CellStyle).string(OrderList[printIndex].tel);
            } else {
                OrderSheet.cell(printRow, 2).style(CellStyle).number(OrderList[printIndex].tel);
            }
            printRow++;
            OrderSheet.cell(printRow, 1).style(HeaderStyle2).string('Email');
            OrderSheet.cell(printRow, 2).style(CellStyle).string(OrderList[printIndex].email);
            printRow++;
            OrderSheet.cell(printRow, 1).style(HeaderStyle2).string('Total Fotos');
            OrderSheet.cell(printRow, 2).style(CellStyle).number(OrderList[printIndex].totalItems);
            printRow++;
            OrderSheet.cell(printRow, 1).style(HeaderStyle2).string('Custo Encomenda');
            OrderSheet.cell(printRow, 2).style(CellStyle).string(OrderList[printIndex].orderCost + ' €');
            printRow++
            OrderSheet.cell(printRow, 1).style(HeaderStyle2).string('Promoção');
            let promotion = OrderList[printIndex].orderPromotion;
            let orderFinalPrice = OrderList[printIndex].orderCost;
            if (promotion.percentage) {
                let discount = OrderList[printIndex].orderCost * promotion.percentage;
                orderFinalPrice -= discount;
                OrderSheet.cell(printRow, 2).style(CellStyle).string(promotion.code + ' -> ' + discount + ' €');
            }
            else if (promotion.value) {
                orderFinalPrice -= promotion.value;
                OrderSheet.cell(printRow, 2).style(CellStyle).string(promotion.code + ' -> ' + promotion.value + ' €');
            } else {
                OrderSheet.cell(printRow, 2).style(CellStyle).string('Nenhuma');
            }
            printRow++
            OrderSheet.cell(printRow, 1).style(HeaderStyle2).string('Custo Final');
            OrderSheet.cell(printRow, 2).style(CellStyle).string(orderFinalPrice + ' €');
            printRow++
            OrderSheet.cell(printRow, 1).style(HeaderStyle2).string('Notas');
            OrderSheet.cell(printRow, 2, printRow, 5, true).style(CellStyle).string(OrderList[printIndex].note);
            printRow++

            // Order items headers
            OrderSheet.cell(printRow, 1, printRow, 2, true).style(HeaderStyle2).string('Evento');
            OrderSheet.cell(printRow, 3).style(HeaderStyle2).string('Nome Ficheiro');
            OrderSheet.cell(printRow, 4).style(HeaderStyle2).string('Tamanho');
            OrderSheet.cell(printRow, 5).style(HeaderStyle2).string('Quantidade');
            printRow++;

            for (let orderPrints = 0; orderPrints < OrderList[printIndex].items.length; orderPrints++, printRow++) {
                OrderSheet.cell(printRow, 1, printRow, 2, true).style(CellStyle).string(OrderList[printIndex].items[orderPrints].album);
                OrderSheet.cell(printRow, 3).style(CellStyle).string(OrderList[printIndex].items[orderPrints].filename);
                OrderSheet.cell(printRow, 4).style(CellStyle).string(OrderList[printIndex].items[orderPrints].size);
                OrderSheet.cell(printRow, 5).style(CellStyle).number(OrderList[printIndex].items[orderPrints].quantity);
            }
        }

        //
        // Save Excel
        //
        // Check if file exists and creates one temporary
        const excelFilepath = `${__basedir}/public/temp_upload/Relatorio-Encomendas.xlsx`;
        await OrderSummary.write(excelFilepath);
        
        function waitWriting() {
            var promise = new Promise(function(resolve, reject) {
              setTimeout(function() {
                resolve();
              }, 2000);
            });
            return promise;
         }

        return await waitWriting();
    }
}