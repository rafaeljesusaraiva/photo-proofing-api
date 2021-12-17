module.exports = {
    condense_photoList: function (array) {
        let newArray = [];

        for (const [index, element] of array.entries()) {
            let albumName = element.item.album.title;
            let imageName = element.item.filename;
            let sizeName = element.size.size;

            for (let i=0; i<newArray.length; i++) {
                let cur = newArray[i];
                if (cur.album === albumName && cur.filename === imageName && cur.size === sizeName) {
                    newArray[i].quantity += 1;
                    continue;
                }
            }

            newArray.push({
                album: albumName,
                filename: imageName,
                size: sizeName,
                quantity: 1
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
    }
}