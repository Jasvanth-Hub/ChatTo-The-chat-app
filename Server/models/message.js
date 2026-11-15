import mongoose, { Schema, model, Types } from "mongoose";

const schema = new Schema(
  {
    content: String,
    clientMessageId: {
      type: String,
      required: false,
    },

    attachments: [
      {
        public_id: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
      },
    ],

    sender: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    chat: {
      type: Types.ObjectId,
      ref: "Chat",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

schema.index(
  { sender: 1, chat: 1, clientMessageId: 1 },
  {
    unique: true,
    partialFilterExpression: { clientMessageId: { $type: "string" } },
  }
);

export const Message = mongoose.models.Message || model("Message", schema);
