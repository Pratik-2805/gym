import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { X } from 'lucide-react-native';

interface ReplyingBannerProps {
  replyingToMessage: any;
  activeConv: any;
  onCancel: () => void;
}

export const ReplyingBanner: React.FC<ReplyingBannerProps> = ({
  replyingToMessage,
  activeConv,
  onCancel,
}) => {
  if (!replyingToMessage) return null;

  let snippet = replyingToMessage.content || replyingToMessage.text || 'Media Message';
  if (typeof snippet === 'string' && snippet.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(snippet);
      snippet = parsed.text || parsed.caption || 'Media Message';
    } catch (e) {}
  }

  const authorName =
    replyingToMessage.direction === 'outbound' || replyingToMessage.sender === 'executive'
      ? 'yourself'
      : activeConv?.name || activeConv?.whatsappName || 'Contact';

  return (
    <View style={styles.replyBanner}>
      <View style={styles.replyBannerBar} />
      <View style={styles.contentContainer}>
        <Text style={styles.replyBannerAuthor}>Replying to {authorName}</Text>
        <Text style={styles.replyBannerText} numberOfLines={1}>
          {snippet}
        </Text>
      </View>
      <TouchableOpacity onPress={onCancel} style={styles.cancelButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <X size={16} color="#8ea0bc" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111b21',
    borderTopWidth: 1,
    borderColor: '#1f2c34',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  replyBannerBar: {
    width: 4,
    height: '100%',
    backgroundColor: '#00ed64',
    borderRadius: 2,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 10,
  },
  replyBannerAuthor: {
    color: '#00ed64',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  replyBannerText: {
    color: '#cbd5e1',
    fontSize: 12,
  },
  cancelButton: {
    padding: 4,
  },
});
