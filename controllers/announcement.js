const { default: mongoose } = require("mongoose")
const Announcement = require("../models/Announcement")

exports.createannouncement = async (req, res) => {
    const { title, content, contentType, url, announcementtype } = req.body;

    if (!title || !contentType) {
        return res.status(400).json({ message: "failed", data: "Please provide title and content type." });
    }

    let mediaUrl = "";

    if (contentType === "image") {
        if (!req.file) {
            return res.status(400).json({ message: "failed", data: "Please select an image first!" });
        }
        mediaUrl = req.file.path;
    } else if (contentType === "video") {
        if (!url) {
            return res.status(400).json({ message: "failed", data: "Please provide a video URL." });
        }
        mediaUrl = url;
    } else {
        return res.status(400).json({ message: "failed", data: "Invalid content type. Allowed: image, video." });
    }

    try {
        await Announcement.create({ title, content, type: contentType, url: mediaUrl, announcementtype: announcementtype });
        return res.status(200).json({ message: "success" });
    } catch (err) {
        console.error(`Error creating news: ${err}`);
        return res.status(500).json({ message: "bad-request", data: "Server error. Please contact support." });
    }
};

exports.editannouncement = async (req, res) => {
    const { id, title, content, contentType, url } = req.body;

    if (!id) {
        return res.status(400).json({ message: "failed", data: "News ID is required." });
    }

    try {
        const existingData = await Announcement.findOne({ _id: id });
        if (!existingData) {
            return res.status(404).json({ message: "failed", data: "News not found." });
        }

        let mediaUrl = existingData.url; 
        if (contentType === "image") {
            if (req.file) {
                mediaUrl = req.file.path; 
            }
        } else if (contentType === "video") {
            if (url) {
                mediaUrl = url; 
            }
        } else if (contentType) {
            return res.status(400).json({ message: "failed", data: "Invalid content type. Allowed: image, video." });
        }

        await Announcement.updateOne(
            { _id: id },
            {
                title: title || existingData.title, 
                content: content || existingData.content, 
                type: contentType || existingData.type,
                announcementtype: existingData.announcementtype,
                url: mediaUrl
            }
        );

        return res.status(200).json({ message: "success" });
    } catch (err) {
        console.error(`Error updating news: ${err}`);
        return res.status(500).json({ message: "bad-request", data: "Server error. Please contact support." });
    }
}

exports.getannouncement = async (req, res) => {

    const {page, limit, filter} = req.query

    const pageOptions = {
        page: parseInt(page) || 0,
        limit: parseInt(limit) || 10
    }

    console.log(filter)

    const AnnouncementData = await Announcement.find({announcementtype: filter})
    .skip(pageOptions.page * pageOptions.limit)
    .limit(pageOptions.limit)
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while fetching News data. Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later."})
    })

    const totalList = await Announcement.countDocuments({ announcementtype: filter });

    const finalData = []


    AnnouncementData.forEach(data => {
        const { id, title, content, type, url,announcementtype } = data

        finalData.push({
            id: id,
            title: title,
            content: content,
            type: type,
            url: url,
            announcementtype: announcementtype
        })
    });

    return res.status(200).json({ message: "success", data: finalData, totalPages: Math.ceil(totalList / pageOptions.limit)})

}

exports.deleteannouncement = async (req, res) => {
    const { id } = req.body

    if(!id){
        return res.status(400).json({ message: "failed", data: "Please input News id."})
    }

    await Announcement.findByIdAndDelete(new mongoose.Types.ObjectId(id))
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while deleting News. Error: ${err}`)
        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later."})
    })

    return res.status(200).json({ message: "success"})
}

// exports.createannouncement = async (req, res) => {
//     const { id } = req.user
//     const { title, description, type } = req.body
//     const link = req.file?.path || ""

//     if (!title || !description || !type) {
//         return res.status(400).json({ message: "failed", data: "Please input all data." })
//     }

//     try {
//         await Announcement.create({ owner: id, title, description, type, link })
//         return res.status(200).json({ message: "success" })
//     } catch (err) {
//         console.log(`There's a problem encountered while creating Content. Error: ${err}.`)
//         return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later." })
//     }
// }


// exports.editannouncement = async (req, res) => {
//     const { id, title, description, type } = req.body
//     const link = req.file?.path || ""

//     if (!title || !description || !type) {
//         return res.status(400).json({ message: "failed", data: "Please input all data." })
//     }

//     try {
//         await Announcement.findOneAndUpdate({ _id: new mongoose.Types.ObjectId(id) }, { title, description, type, link })
//         return res.status(200).json({ message: "success" })
//     } catch (err) {
//         console.log(`There's a problem encountered while updating Content. Error: ${err}.`)
//         return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later." })
//     }
// }

// exports.deleteannouncement = async (req, res) => {
//     const { id } = req.query

//     if (!id) {
//         return res.status(400).json({ message: "failed", data: "Please input ID field." })
//     }

//     try {
//         await Announcement.findOneAndDelete({ _id: new mongoose.Types.ObjectId(id) })
//         return res.status(200).json({ message: "success" })
//     } catch (err) {
//         console.log(`There's a problem encountered when deleting content. Error: ${err}`)
//         return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later." })
//     }
// }

// exports.getannouncement = async (req, res) => {
//     const { type, limit, page } = req.query
//     const pageOptions = {
//         limit: parseInt(limit) || 10,
//         page: parseInt(page) || 0
//     }

//     try {
//         const contentData = await Announcement.aggregate([
//             {
//                 $match: {
//                     type: { $regex: `^${type}$`, $options: 'i' }
//                 }
//             },
//             {
//                 $sort: { createdAt: -1 }
//             },
//             {
//                 $limit: pageOptions.limit
//             },
//             {
//                 $skip: pageOptions.limit * pageOptions.page
//             }
//         ])

//         const finalData = contentData.map(temp => {
//             const { _id, title, description, link } = temp
//             return {
//                 id: _id,
//                 title,
//                 description,
//                 link
//             }
//         })

//         return res.status(200).json({ message: "success", data: finalData })
//     } catch (err) {
//         console.log(`There's a problem while fetching content data. Error: ${err}`)
//         return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later." })
//     }
// }



// exports.massMapContent = async (req, res) => {
//     const { id } = req.user
//     const mapcontentt = Array.isArray(req.body.mapObjectArray) ? req.body.mapObjectArray : [req.body.mapObjectArray]
//     let index = 0
//     let mapContentData = []

//     mapcontentt.forEach(item => {
//         const parsedItem = JSON.parse(item)
//         mapContentData.push({
//             owner: id,
//             title: parsedItem.title,
//             description: parsedItem.description,
//             type: parsedItem.type,
//             link: req.files[index]?.path || ""
//         })
//         index++
//     })

//     const mapBulkWrite = mapContentData.map(data => ({
//         insertOne: {
//             document: { owner: id, title: data.title, description: data.description, link: data.link, type: data.type }
//         }
//     }))

//     try {
//         await Announcement.bulkWrite(mapBulkWrite)
//         return res.status(200).json({ message: "success" })
//     } catch (err) {
//         console.log(`There's a problem encountered while creating multiple Content. Error: ${err}.`)
//         return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later." })
//     }
// }