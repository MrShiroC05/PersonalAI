import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../styles/theme';
import type { ChatMessage } from '../types/chat';

type Props = {
  message: ChatMessage;
};

export default function ChatBubble({ message }: Props) {
  const isUser = message.role === 'user';

  return (
    <View
      style={[
        styles.row,
        isUser ? styles.userRow : styles.assistantRow,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        <Text
          style={[
            styles.message,
            isUser ? styles.userText : styles.assistantText,
          ]}
        >
          {message.text}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    marginBottom: spacing.md,
  },
  userRow: {
    alignItems: 'flex-end',
  },
  assistantRow: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '86%',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  userBubble: {
    backgroundColor: colors.userBubble,
    borderBottomRightRadius: radius.sm,
  },
  assistantBubble: {
    backgroundColor: colors.assistantBubble,
    borderBottomLeftRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  message: {
    fontSize: 15,
    lineHeight: 23,
  },
  userText: {
    color: '#FFF5FC',
  },
  assistantText: {
    color: colors.text,
  },
});