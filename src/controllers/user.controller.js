import { asyncHandler } from "../utils/async-handler.js";

const resgisterUser = asyncHandler( async (req, res) => {
    res.status(200).json({
        message: "Hare Krsna!"
    });
});

export { resgisterUser };