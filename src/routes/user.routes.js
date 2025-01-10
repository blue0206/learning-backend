import { Router } from "express";
import { 
    resgisterUser, 
    loginUser, 
    logoutUser, 
    refreshAccessToken, 
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    resgisterUser
);
router.route("/login").post(loginUser);

// Secured routes.
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").patch(verifyJWT, changeCurrentPassword);
router.route("/get-current-user").get(verifyJWT, getCurrentUser);
router.route("/update-account-details").patch(verifyJWT, updateAccountDetails);
router.route("/update-avatar").patch(
    upload.single("avatar"),
    verifyJWT,
    updateUserAvatar
);

export default router;