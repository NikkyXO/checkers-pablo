import Joi from "joi";
import { Request } from "express";

import CustomError from "@/utilities/custom-error";
import MessageModel, { MessageType } from "@/models/message.model";
import UserModel from "@/models/user.model";

class UserService {
    // create  conversation
    async sendMessage({ body, $currentUser }: Partial<Request>) {
        const { error, value: data } = Joi.object({
            body: Joi.object({
                subject: Joi.string().trim().required().label("Subject"),
                content: Joi.string().trim().required().label("Content"),
                recipient: Joi.string().trim().required().label("Recipient"),
            }),
            $currentUser: Joi.object({
                _id: Joi.required(),
            }),
        })
            .options({ stripUnknown: true })
            .validate({ body, $currentUser });
        if (error) throw new CustomError(error.message, 400);

        const user = await UserModel.findOne({ _id: data.$currentUser._id });
        if (!user) throw new CustomError("user not found", 404);
        const recipient = await UserModel.findOne({ _id: data.body.recipient });
        if (!recipient) throw new CustomError("recipient not found", 404);
        if ((user._id as string).toString() === (recipient._id as string).toString()) throw new CustomError("Sorry, you can't send to self", 404);

        const payload = {
            subject: data.body.subject,
            content: data.body.content,
            recipient: data.body.recipient,
            sender: data.$currentUser._id,
            isRead: false,
        };

        const message = await new MessageModel(payload).save();

        return message;
    }

    async openMessage({ $currentUser, params }: Partial<Request>) {
        const { error, value: data } = Joi.object({
            params: Joi.object({
                messageId: Joi.string().trim().required().label("Message Id"),
            }),
            $currentUser: Joi.object({
                _id: Joi.required(),
            }),
        })
            .options({ stripUnknown: true })
            .validate({ params, $currentUser });
        if (error) throw new CustomError(error.message, 400);

        const user = await UserModel.findOne({ _id: data.$currentUser._id });
        if (!user) throw new CustomError("user not found", 404);

        const message = await MessageModel.findOneAndUpdate({ _id: data.params.messageId, recipient: user._id }, { isRead: true }, { new: true });
        if (!message) throw new CustomError("Message not found or you are not the recipient", 404);

        return message;
    }


    async getUserMessages({ $currentUser, query }: Partial<Request>) {
        console.log({ $currentUser, query });
        const { error, value: data } = Joi.object({
            $currentUser: Joi.object({
                _id: Joi.required(),
            }).required(),
            query: Joi.object({
                search: Joi.string().optional().allow(""),
                type: Joi.string()
                    .valid(...Object.values(MessageType))
                    .optional(),
                page: Joi.number().min(1).default(1),
                limit: Joi.number().min(1).max(100).default(20),
            }).default({}),
        })
            .options({ stripUnknown: true })
            .validate({ $currentUser, query });
    
        if (error) throw new CustomError(error.message, 400);
    
        const user = await UserModel.findOne({ _id: data.$currentUser._id });
        if (!user) throw new CustomError("User not found", 404);
    
        const { search, type, page=1, limit=10 } = query as any;
    
        const filter: any = { recipient: user._id };
    
        if (type) {
            filter.type = type;
        }
    
        if (search) {
            filter.$or = [
                { content: { $regex: search, $options: "i" } },
                { subject: { $regex: search, $options: "i" } },
            ];
        }
    
        const messagesCount = await MessageModel.countDocuments(filter);
        const unReadCount = await MessageModel.countDocuments({ ...filter, isRead: false })
        const messages = await MessageModel.find(filter)
            .populate("sender", "first_name last_name image")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
    
        return {
            messages,
            messagesCount,
            unReadCount,
            page,
            limit,
        };
    }
    

    async updateMessage({ $currentUser, params, body }: Partial<Request>) {
        const { error, value: data } = Joi.object({ 
            $currentUser: Joi.object({
                _id: Joi.required(),
            }).required(),

            body: Joi.object({
                type: Joi.string()
                    .valid(...Object.values(MessageType))
                    .optional()
                    .label("Message Type"),
                messageId: Joi.string().required(),
            }).required(),
        })
            .options({ stripUnknown: true })
            .validate({ params, $currentUser, body });
        if (error) throw new CustomError(error.message, 400);

        const user = await UserModel.findOne({ _id: data.$currentUser._id });
        if (!user) throw new CustomError("user not found", 404);
        const message = await MessageModel.findOneAndUpdate(
            { _id: data.body.messageId, recipient: user._id },
            { type: data.body.type},
            { new: true }
        );
    
        if (!message) throw new CustomError("Message not found or you are not the recipient", 404);

        return message;
    }
}

export default new UserService();
