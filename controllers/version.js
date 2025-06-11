const Version = require("../models/Version");


exports.getActiveVersion = async (req, res) => {
    const data = await Version.findOne({ isActive: true })
        .sort({ releaseDate: -1 })
        .exec()
        .catch(err => {
            console.log(`Error fetching active version: ${err}`);
            return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later." });
        });

    if (!data) {
        return res.status(404).json({ message: "not-found", data: "No active version found." });
    }

    return res.status(200).json({
        message: "success",
        data: {
            id: data._id,
            version: data.version,
            description: data.description,
            releaseDate: data.releaseDate,
            isActive: data.isActive
        }
    });
}

exports.editversion = async (req, res) => {
    const { id, version, description, isActive } = req.body;

    if( !id) {
        return res.status(400).json({ message: "bad-request", data: "Version ID is required." });
    }
    const updateData =  { }

    if (version) updateData.version = version;
    if (description) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "bad-request", data: "No fields to update." });
    }
        const updatedVersion = await Version.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        )
        .catch(err => {
            console.log(`Error updating version: ${err}`);
            return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later." });
        });

        if (!updatedVersion) {
            return res.status(404).json({ message: "not-found", data: "Version not found." });
        }

        return res.status(200).json({
            message: "success",
        });


}


