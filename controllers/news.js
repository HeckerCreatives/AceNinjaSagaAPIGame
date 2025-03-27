const { default: mongoose } = require("mongoose")
const News = require("../models/News")


// exports.creatnews = async (req, res) => {
   
//     const { title, content} = req.body

//     if(!title || !content){
//         return res.status(400).json({ message: "failed", data: "Please input title and type."})
//     }

//     await News.create({ title: title, content: content})
//     .then(data => data)
//     .catch(err => {
//         console.log(`There's a problem encountered while creating News. Error: ${err}`)

//         return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details."})
//     })

//     return res.status(200).json({ message: "success"})

// }

exports.createnews = async (req, res) => {
    const { title, content, contentType, url } = req.body;

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
        await News.create({ title, content, type: contentType, url: mediaUrl });
        return res.status(200).json({ message: "success" });
    } catch (err) {
        console.error(`Error creating news: ${err}`);
        return res.status(500).json({ message: "bad-request", data: "Server error. Please contact support." });
    }
};

exports.editnews = async (req, res) => {
    const { newsid, title, content, contentType, url } = req.body;

    if (!newsid) {
        return res.status(400).json({ message: "failed", data: "News ID is required." });
    }

    try {
        const existingNews = await News.findOne({ _id: newsid });
        if (!existingNews) {
            return res.status(404).json({ message: "failed", data: "News not found." });
        }

        let mediaUrl = existingNews.url; 
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

        await News.updateOne(
            { _id: newsid },
            {
                title: title || existingNews.title, 
                content: content || existingNews.content, 
                type: contentType || existingNews.type,
                url: mediaUrl
            }
        );

        return res.status(200).json({ message: "success" });
    } catch (err) {
        console.error(`Error updating news: ${err}`);
        return res.status(500).json({ message: "bad-request", data: "Server error. Please contact support." });
    }
}

exports.getnews = async (req, res) => {

    const {page, limit} = req.query

    const pageOptions = {
        page: parseInt(page) || 0,
        limit: parseInt(limit) || 10
    }

    const NewsData = await News.find()
    .skip(pageOptions.page * pageOptions.limit)
    .limit(pageOptions.limit)
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while fetching News data. Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later."})
    })

    const totalNews = await News.countDocuments();

    const finalData = []


    NewsData.forEach(data => {
        const { id, title, content, type, url } = data

        finalData.push({
            id: id,
            title: title,
            content: content,
            type: type,
            url: url
        })
    });

    return res.status(200).json({ message: "success", data: finalData, totalPages: Math.ceil(totalNews / pageOptions.limit)})

}

// exports.editnews = async (req, res) => {
    
//     const {id, action, title, content} = req.body

//     if(!id || !action){
//         return res.status(400).json({ message: "failed", data: "Please input News id and action."})
//     }

//     if(!content){
//         return res.status(400).json({ message: "failed", data: "Please input content fields."})
//     }

//     if(action === "add"){
//         await News.findByIdAndUpdate(
//             id, 
//             { 
//                 $set: { title: title},
//                 $push: { 
//                 content: { 
//                     $each: Array.isArray(content) ? content: [content] 
//                 } 
//             } 
//         })
//         .then(data => data)
//         .catch(err => {
//             console.log(`There's a problem encountered while editting News with the action ${action}. Error: ${err}`)

//             return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later."})
//         })
//     } else if(action === "edit"){
//         const bulkOps = content.map((content) => ({
//             updateOne: {
//                 filter: { _id: id, "content._id": content.id },
//                 update: {
//                     $set: {
//                         "content.$.type": content.type,
//                         "content.$.value": content.value,
//                     },
//                 },
//             },
//         }));

//         if (title) {
//             bulkOps.push({
//                 updateOne: {
//                     filter: { _id: id },
//                     update: { $set: { title } },
//                 },
//             });
//         }
//          await News.bulkWrite(bulkOps)
//          .then(data => data)
//          .catch(err => {
//             console.log(`There's a problem encountered while editting News with the action ${action}. Error: ${err}`)

//             return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later."})
//          })
//     } else if(action === "force"){
//         const newNewsData = {
//             id: id,
//             title: title,
//             content: content
//         }
//         await News.findOneAndReplace({ _id: id}, newNewsData)
//         .then(data => data)
//         .catch(err => {
//             console.log(`There's a problem encountered while editting News with the action ${action}. Error: ${err}`)
//             return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later."})
//         })
//     } else {
//         return res.status(400).json({ message: "failed", data: "Action must be add/edit or delete."})
//     }

//     return res.status(200).json({ message: "success"})
// }

exports.deletenews = async (req, res) => {
    const { id } = req.body

    if(!id){
        return res.status(400).json({ message: "failed", data: "Please input News id."})
    }

    await News.findByIdAndDelete(new mongoose.Types.ObjectId(id))
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while deleting News. Error: ${err}`)
        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later."})
    })

    return res.status(200).json({ message: "success"})
}