import { CONFIGS } from "@/configs";
import messageController from "@/controllers/v1/message.controller";
import authGuard from "@/middlewares/auth.middleware";
import { Router } from "express";

const router: Router = Router();

router.post("/send-message", authGuard(CONFIGS.APP_ROLES.USER), messageController.sendMessage);

router.get("/open-message/:messageId", authGuard(CONFIGS.APP_ROLES.USER), messageController.openMessage);
router.patch("/update-message", authGuard(CONFIGS.APP_ROLES.USER), messageController.updateMessageById);

router.get("/user-messages", authGuard(CONFIGS.APP_ROLES.USER), messageController.userMessages);

export default router;
