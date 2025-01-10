import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        // Update user refresh token entry.
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });
        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh tokens.");
    }
}

const resgisterUser = asyncHandler(async (req, res) => {
    // STEPS:
    // Get details.
    // Validate data.
    // Check if data already exists.
    // Check if images/avatar uploaded.
    // Upload those images/avatar to cloudinary.
    // Check if images/avatar uploaded to cloudinary.
    // Create user object and create entry in database.
    // Check if user created.
    // Remove password and refresh token from created user response object to be sent.
    // Return response upon successful creation.

    console.log("Request Body:\n", req.body);
    const {username, email, fullname, password} = req.body;
    // Check if required fields provided and not empty.
    if (
        [username, email, fullname, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required.");
    }
    // Check if username is lower-case.
    if (username != username.toLowerCase()) {
        throw new ApiError(400, "Username should be in lower-case.");
    }
    // Check if email is valid.
    if (!email.includes("@") || email != email.toLowerCase()) {
        throw new ApiError(400, "Email is invalid.");
    }
    // Check in database if user already exists.
    const userExists = await User.findOne({
        $or: [{username}, {email}]
    });
    if (userExists) {
        throw new ApiError(409, "The username or email already exists.");
    }
    console.log("MULTER UPLOAD:\n" ,req.files);
    let avatarPath = "";
    // Check if avatar and cover-image provided.
    if (req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0) {
        avatarPath = req.files.avatar[0].path;
    }
    let coverImagePath = "";
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImagePath = req.files.coverImage[0].path;
    }
    
    if (!avatarPath) {
        throw new ApiError(400, "Avatar is required.");
    }
    const avatar = await uploadOnCloudinary(avatarPath);
    const coverImage = !coverImagePath ? "" : await uploadOnCloudinary(coverImagePath);
    // Check if avatar uploaded successfully on cloudinary.
    if (!avatar) {
        throw new ApiError(400, "Avatar is required.");
    }
    // Create user.
    const user = await User.create({
        username,
        email,
        fullname,
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || ""
    });
    // Check if user entry created in database and remove fields not to be shared in response.
    const createdUser = await User.findById(user._id).select("-password -refreshToken");
    if (!createdUser) {
        throw new ApiError(500, "Internal server error.");
    }
    // Return success response with status.
    return res.status(201).json(new ApiResponse(201, createdUser, "User registered successfully!"));
});

const loginUser = asyncHandler(async (req, res) => {
    // STEPS:
    // Get data.
    // Check username or email.
    // Check password.
    // Access and refresh token.
    // Send cookies.
    // Login.

    const {username, email, password} = req.body;
    // Check if either username or email provided.
    if (!(username || email)) {
        throw new ApiError(404, "Username or Email is required.");
    }
    // Check if the user exists.
    const userExists = await User.findOne({
        $or: [{email}, {username}]
    });
    if (!userExists) {
        throw new ApiError(405, "The user does not exist.");
    }
    // Check if the password is correct.
    const passwordCorrect = await userExists.isPasswordCorrect(password);
    if (!passwordCorrect) {
        throw new ApiError(408, "The password is incorrect.");
    }
    // Generate access and refresh tokens.
    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(userExists._id);
    const loggedInUser = await User.findById(userExists._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true
    };

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(
        200,
        {
            user: loggedInUser, accessToken, refreshToken
        },
        "User logged in successfully."
    ));
});

const logoutUser = asyncHandler(async (req, res) => {
    // STEPS:
    // Remove refresh tokens.
    // Clear cookies.
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        }, {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    };

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(
            200,
            {},
            "User logged out successfully."
        )
    );
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    // Get data (token).
    // Check if data exists.
    // Verify token using jwt.
    // Check if successfully verified.
    // Search for user object in DB with id received from token.
    // Check if user object exists.
    // Check if user refresh token and incoming refresh token are same.
    // Generate access token and refresh token anew.
    // Send as cookie.

    // Get incoming refresh token.
    const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken;
    if (!incomingRefreshToken) {
        throw new ApiError(400, "Unauthorized Request.");
    }
    try {
        // Decode token.
        const decodeToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
        if (!decodeToken) {
            throw new ApiError(400, "Invalid Refresh Token.");
        }
        // Get user from DB using id from token.
        const user = await User.findById(decodeToken._id);
        // Check if user exists.
        if (!user) {
            throw new ApiError(400, "Invalid Refresh Token.");
        }
        // Check if incoming token and user token in DB are same.
        if (incomingRefreshToken !== user.refreshToken) {
            throw new ApiError(400, "Refresh token is expired or used.");
        }
        // Generate new access and refresh tokens.
        const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id);

        // Options for sending secure cookie.
        const options = {
            httpOnly: true,
            secure: true
        };

        res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    accessToken,
                    refreshToken
                },
                "Access token refreshed successfully."
            )
        );
    } catch (error) {
        throw new ApiError(400, error?.message || "Invalid Refresh Token.");
    }
    
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    // STEPS:
    // Get old and new password.
    // Get user from DB using id.
    // Check if user fetched.
    // Check if password is correct.
    // Change password.
    // Update DB.
    const {oldPassword, newPassword} = req.body;
    const user = await User.findById(req.user?._id);
    // Check if user fetched correctly.
    if (!user) {
        throw new ApiError(500, "Error fetching user from server.");
    }
    // Check if password provided by user is correct.
    const validatePassword = await user.isPasswordCorrect(oldPassword);
    if (!validatePassword) {
        throw new ApiError(400, "The password is incorrect.");
    }
    // Update password and save.
    user.password = newPassword;
    await user.save({validateBeforeSave: false});

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "Use password changed successfully."
        )
    );
});

const getCurrentUser = asyncHandler(async (req, res) => {
    // The auth middleware performs all the necessary checks and provides
    // user as a part of req object. We just return it.
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            req.user,
            "User fetched successfully."
        )
    );
});

const updateAccountDetails = asyncHandler(async (req, res) => {
    // STEPS:
    // Get fields to be updated.
    // Fetch user from DB by getting details from req.
    // Update details and save.
    // Check if updated successfully.

    const {newFullname, newEmail} = req.body;
    // Check if at least one field is provided.
    if (!(newFullname || newEmail)) {
        throw new ApiError(400, "Fullname or Email is required.");
    }
    // Fetch user from DB and update details.
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname: newFullname || fullname,
                email: newEmail || email
            },
        },
        {
            new: true
        }
    ).select("-password -refreshToken");
    // Check if updated successfully.
    if (!user) {
        throw new ApiError(500, "Error updating user details.");
    }
    // Return response.
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user,
            "User account details updated successfully."
        )
    );
});

const updateUserAvatar = asyncHandler(async (req, res) => {
    // Check if avatar uploaded locally successfully.
    // Upload avatar on cloudinary.
    // Check if uploaded on cloudinary.
    // Fetch and update user in DB.
    // Check if updated successfully.

    const avatarLocalPath = req.file?.path || "";
    // Check if user has uploaded avatar.
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required.");
    }
    // Upload on cloudinary.
    const uploadedAvatar = await uploadOnCloudinary(avatarLocalPath);
    // Check if uploaded on cloudinary.
    if (!uploadedAvatar) {
        throw new ApiError(400, "Error while uploading avatar.");
    }
    // Find user in DB and update.
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: uploadedAvatar.url
            }
        },
        {
            new: true
        }
    ).select("-password -refreshToken");
    // Check if user updated successfully.
    if (!user) {
        throw new ApiError(500, "Error updating the avatar.");
    }
    // Remove old avatar from cloudinary.
    await deleteFromCloudinary(req.user?.avatar);
    // Return response.
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user,
            "User avatar updated successfully."
        )
    );
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
    // Same as updateUserAvatar.
    const coverImageLocalPath = req.file?.path || "";
    // Check if cover image uploaded by user.
    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image is required.");
    }
    // Upload cover image on cloudinary.
    const uploadedCoverImage = await uploadOnCloudinary(coverImageLocalPath);
    // Check if cover image uploaded succesfully on cloudinary.
    if (!uploadedCoverImage) {
        throw new ApiError(400, "Error uploading cover image.");
    }
    // Find user in DB and update.
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: uploadedCoverImage.url
            }
        },
        {
            new: true
        }
    );
    // Check if user updated successfully.
    if (!user) {
        throw new ApiError(500, "Error updating the cover image.");
    }
    // Remove old cover image from cloudinary.
    await deleteFromCloudinary(req.user?.coverImage);
    // Return response.
    res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user,
            "User cover image updated successfully."
        )
    );
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const {username} = req.params;
    // Check if username correct.
    if (!username?.trim()) {
        throw new ApiError(400, "The username is missing.");
    }
    // Get channel details for username.
    const channel = await User.aggregate([
        {
            $match: {
                username: username.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                subscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                username: 1,
                fullname: 1,
                email: 1,
                avatar: 1,
                coverImage: 1,
                subscriberCount: 1,
                subscribedToCount: 1,
                isSubscribed: 1
            }
        }
    ]);
    // Check if channel exists.
    if (!channel?.length) {
        throw new ApiError(404, "The channel does not exist.");
    }
    // MAKE SURE TO CHECK CHANNEL IN CONSOLE LOG.
    console.log("CHANNEL\n", channel);
    // Return response.
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            channel[0],
            "User channel fetched successfully."
        )
    );
});

export { 
    resgisterUser, 
    loginUser, 
    logoutUser, 
    refreshAccessToken, 
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile
};