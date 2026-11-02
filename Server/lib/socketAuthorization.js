export const isChatMember = (chat, userId) =>
  Boolean(chat?.members?.some((member) => member.equals(userId)));
