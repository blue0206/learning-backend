import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
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

export { resgisterUser, loginUser, logoutUser };