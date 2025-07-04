const { default: mongoose } = require("mongoose")
const { News, ItemNews, NewsRead } = require("../models/News");
const Announcement = require("../models/Announcement")
const { checkcharacter } = require("../utils/character");


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
    const {page, limit, type, gender, characterid} = req.query

    const pageOptions = {
        page: parseInt(page) || 0,
        limit: parseInt(limit) || 10
    }

    let query = {};
    if (type) {
        query.type = type;
    }

    const NewsData = await News.find(query)
    .sort({ createdAt: -1 })
    .skip(pageOptions.page * pageOptions.limit)
    .limit(pageOptions.limit)
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while fetching News data. Error: ${err}`)
        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later."})
    })

    const readNews = await NewsRead.find({ owner: characterid })
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while fetching read news data. Error: ${err}`)
        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later."})
    })

    const totalNews = await News.countDocuments();
    
    let ItemNewsData = await ItemNews.findOne()
    .sort({ createdAt: -1 })
    .populate('items.itemid', 'name gender')

    if (ItemNewsData) {
        let allItemNews = await ItemNews.find()
            .sort({ createdAt: -1 })
            .populate('items.itemid', 'name gender');

        if (allItemNews[0].items[0].itemid.gender === 'unisex'){
            ItemNewsData = allItemNews[0];
        } else {
            ItemNewsData = allItemNews.find(news => 
            news.items.some(item => 
                item.itemid && item.itemid.gender === gender
            )
            ) || null;

        }
    }

    let formattedResponse = {
        data: {}
    };

    const newsdata = {}
    let index = 0

    NewsData.forEach(temp => {
        const { _id, title, content, type, url, createdAt } = temp;
        const isRead = readNews.some(read => read.news && read.news.toString() === _id.toString());
        newsdata[index] = {
            id: _id,
            title,
            content,
            type,
            url,
            createdAt: createdAt,
            isRead: isRead
        };
        index++;
    })

    formattedResponse = {
        data: {
            news: newsdata,
            pagination: {
                total: totalNews,
                page: pageOptions.page,
                limit: pageOptions.limit,
                pages: Math.ceil(totalNews / pageOptions.limit)
            }
        }
    }

    if (ItemNewsData && type !== 'video') {
        const { _id, title, items } = ItemNewsData;

        if (!gender){
            return res.status(400).json({ message: "failed", data: "Please input character gender."})
        }

        const isItemNewsRead = readNews.some(read => read.itemNews && read.itemNews.toString() === _id.toString());

        const filteredItems = items.filter(item =>
            item.itemid?.gender === gender || item.itemid?.gender === 'unisex'
        );

        const formattedItems = {
            itemid: filteredItems[0]?.itemid ? filteredItems[0].itemid._id : null,
            name: filteredItems[0]?.itemid ? filteredItems[0].itemid.name : null,
            itemtype: filteredItems[0]?.itemtype || null
        };
        
        formattedResponse.data = {
            itemnews: {
                id: _id,
                title,
                item: formattedItems,
                isRead: isItemNewsRead
            },
            news: formattedResponse.data.news,
            pagination: formattedResponse.data.pagination
        };
    } else {
        formattedResponse.data = {
            itemnews: {},
            news: formattedResponse.data.news,
            pagination: formattedResponse.data.pagination
        };
    }
        
    return res.status(200).json({
        message: "success",
        data: formattedResponse.data,
        pagination: formattedResponse.pagination
    });
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

exports.readnews = async (req, res) => {
    const { id } = req.user;
    const { characterid, newsid, itemnewsid, announcementid } = req.body;

    if (!characterid) {
        return res.status(400).json({
            message: "failed",
            data: "Please input the character id and news id."
        });
    }

    if ((!newsid || !mongoose.Types.ObjectId.isValid(newsid)) && 
        (!itemnewsid || !mongoose.Types.ObjectId.isValid(itemnewsid)) &&
        (!announcementid || !mongoose.Types.ObjectId.isValid(announcementid))) {
        return res.status(400).json({
            message: "failed",
            data: "Please input the news id, item news id, or announcement id."
        });
    }

    const checker = await checkcharacter(id, characterid);

    if (checker === "failed") {
        return res.status(400).json({
            message: "Unauthorized",
            data: "You are not authorized to view this page. Please login the right account to view the page."
        });
    }

    const updateData = {
        owner: characterid,
        news: newsid ? new mongoose.Types.ObjectId(newsid) : null,
        itemNews: itemnewsid ? new mongoose.Types.ObjectId(itemnewsid) : null,
        announcement: announcementid ? new mongoose.Types.ObjectId(announcementid) : null
    }

    if (newsid) {
        const news = await News.findById(new mongoose.Types.ObjectId(newsid))
        .then(data => data)
        .catch(err => {
            console.error(`Error fetching news: ${err}`);
            return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later." });
        });
        
        if (!news) {
            return res.status(404).json({
                message: "failed",
                data: "News not found."
            });
        }
    } else if (itemnewsid) {
        const itemNews = await ItemNews.findById(new mongoose.Types.ObjectId(itemnewsid))
        .then(data => data)
        .catch(err => {
            console.error(`Error fetching item news: ${err}`);
            return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later." });
        });

        if (!itemNews) {
            return res.status(404).json({
                message: "failed",
                data: "Item news not found."
            });
        }
    } else if (announcementid) {
        const announcement = await Announcement.findById(new mongoose.Types.ObjectId(announcementid))
        .then(data => data)
        .catch(err => {
            console.error(`Error fetching announcement: ${err}`);
            return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later." });
        });

        if (!announcement) {
            return res.status(404).json({
                message: "failed", 
                data: "Announcement not found."
            });
        }
    } else {
        return res.status(400).json({
            message: "failed",
            data: "Please provide either news id, item news id, or announcement id."
        });
    }

    const newsRead = await NewsRead.findOneAndUpdate(
        updateData,
        { readAt: new Date() },
        { upsert: true, new: true }
    ).then(data => data)
      .catch(err => {
          console.error(`Error updating news read status: ${err}`);
          return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later." });
      });

    if (!newsRead) {
        return res.status(400).json({
            message: "failed",
            data: "Failed to mark news as read."
        });
    }

    return res.status(200).json({
        message: "success",
    });
}