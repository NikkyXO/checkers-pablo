import Joi from "joi";
import { Request } from "express";

import UserModel from "@/models/user.model";
import CustomError from "@/utilities/custom-error";
import MessageModel, { MessageType } from "@/models/message.model";

class UserService {
    async getCurrentUser({ $currentUser }: Partial<Request>) {
        const { error, value: data } = Joi.object({
            $currentUser: Joi.object({
                _id: Joi.required(),
            }),
        })
            .options({ stripUnknown: true })
            .validate({ $currentUser });
        if (error) throw new CustomError(error.message, 400);
        const user = await UserModel.findOne({ _id: data.$currentUser._id });
        if (!user) throw new CustomError("user not found", 404);

        const messagesCount = await MessageModel.countDocuments({ recipient: user._id });
        const unReadCount = await MessageModel.countDocuments({ recipient: user._id, isRead: false });

        // Get message count grouped by MessageType
    const messagesByType = await MessageModel.aggregate([
        { $match: { recipient: user._id } },
        { $group: { _id: "$type", count: { $sum: 1 } } },
    ]);

    const messageTypeStats: Record<MessageType, number> = Object.values(MessageType).reduce((acc, type) => {
        acc[type] = 0;
        return acc;
    }, {} as Record<MessageType, number>);

    messagesByType.forEach(({ _id, count }) => {
        if (_id in messageTypeStats) {
            messageTypeStats[_id as MessageType] = count;
        }
    });

        return {
            user,
            messagesCount,
            unReadCount,
            messageTypeStats,
        };
    }

    async getAllUsers() {
        return await UserModel.find();
    }
}

export default new UserService();
