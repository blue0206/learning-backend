import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const extractPublicId = (url) => {
    const parts = url.split("/");
    const targetPart = parts[parts.length-1];
    const publicId = targetPart.split('.')[0];
    return publicId;
};

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        });
        // File has been uploaded successfully.
        console.log("File is uploaded on cloudinary: ", response.url);  // Do check response object itself with console.log
        console.log("CLOUDINARY OBJECT:\n", response);
        fs.unlinkSync(localFilePath);
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath);
        return null;
    }
};

const deleteFromCloudinary = async (imageUrl) => {
    try {
        if (!imageUrl) return null;
        const publicId = extractPublicId(imageUrl);
        await cloudinary.uploader.destroy(publicId, (result) => console.log(result));
    } catch (error) {
        console.log("Error deleting image from cloudinary: ", error);
    }
};

export { uploadOnCloudinary, deleteFromCloudinary };