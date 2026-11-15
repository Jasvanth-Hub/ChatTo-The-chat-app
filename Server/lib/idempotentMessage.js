const duplicateKeyError = (error) => error?.code === 11000;

export const createOrGetMessage = async ({ Message, chatId, senderId, clientMessageId, content }) => {
  const key = { chat: chatId, sender: senderId, clientMessageId };
  const existing = await Message.findOne(key);
  if (existing) return { message: existing, created: false };

  try {
    const message = await Message.create({
      ...key,
      content,
    });
    return { message, created: true };
  } catch (error) {
    if (!duplicateKeyError(error)) throw error;

    // A concurrent retry may win the unique-index race. Return its saved row.
    const racedMessage = await Message.findOne(key);
    if (racedMessage) return { message: racedMessage, created: false };
    throw error;
  }
};
