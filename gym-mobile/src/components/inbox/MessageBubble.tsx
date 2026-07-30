import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Modal, SafeAreaView, StatusBar, Platform, Linking, TextInput, KeyboardAvoidingView } from 'react-native';
import { Check, CheckCheck, AlertCircle, Clock, Video as VideoIcon, FileText, Play, ArrowLeft, Download, Send, X, Paperclip, Camera } from 'lucide-react-native';

interface MessageBubbleProps {
  item: any;
  isMe: boolean;
  activeConv: any;
  messages: any[];
  showDate: boolean;
  getDateLabel: (iso: string) => string;
  formattedTime: string;
  authToken: string | null;
  getBackendUrl: () => string;
  onSelectReply?: (msg: any) => void;
  onSendDirectReply?: (replyText: string, targetMsg: any) => Promise<void>;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  item,
  isMe,
  activeConv,
  messages,
  showDate,
  getDateLabel,
  formattedTime,
  authToken,
  getBackendUrl,
  onSelectReply,
  onSendDirectReply,
}) => {
  const [imageError, setImageError] = useState(false);
  const [isFullscreenVisible, setIsFullscreenVisible] = useState(false);
  const [isReplyingInModal, setIsReplyingInModal] = useState(false);
  const [modalReplyText, setModalReplyText] = useState('');
  const [modalSending, setModalSending] = useState(false);

  // 1. Extract media & JSON payload details if present
  let parsedJson: any = null;
  const rawContent = item.content || item.text || '';
  if (typeof rawContent === 'string' && rawContent.trim().startsWith('{')) {
    try {
      parsedJson = JSON.parse(rawContent);
    } catch (e) { }
  }

  const outboundMedia =
    item.outboundPayload?.image ||
    item.outboundPayload?.video ||
    item.outboundPayload?.audio ||
    item.outboundPayload?.document;

  const rawMediaUrl =
    item.mediaUrl ||
    parsedJson?.mediaUrl ||
    outboundMedia?.link ||
    outboundMedia?.url;

  let fullMediaUrl = rawMediaUrl
    ? (rawMediaUrl.startsWith('http')
      ? rawMediaUrl
      : `${getBackendUrl()}${rawMediaUrl.startsWith('/') ? '' : '/'}${rawMediaUrl}`)
    : null;

  if (fullMediaUrl && authToken && !fullMediaUrl.includes('token=')) {
    fullMediaUrl += `${fullMediaUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(authToken)}`;
  }

  const mediaImageSource = fullMediaUrl
    ? {
      uri: fullMediaUrl,
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
    }
    : null;

  let effectiveMimeType = item.mimeType || parsedJson?.mimeType;

  if (!effectiveMimeType && outboundMedia) {
    if (item.outboundPayload?.image) effectiveMimeType = 'image/jpeg';
    else if (item.outboundPayload?.video) effectiveMimeType = 'video/mp4';
    else if (item.outboundPayload?.audio) effectiveMimeType = 'audio/mpeg';
    else if (item.outboundPayload?.document) effectiveMimeType = 'application/pdf';
  }

  if (!effectiveMimeType && fullMediaUrl) {
    if (/\.(jpg|jpeg|png|webp|gif)($|\?)/i.test(fullMediaUrl)) effectiveMimeType = 'image/jpeg';
    else if (/\.(mp4|mov|webm)($|\?)/i.test(fullMediaUrl)) effectiveMimeType = 'video/mp4';
    else if (/\.(mp3|ogg|wav|m4a|aac)($|\?)/i.test(fullMediaUrl)) effectiveMimeType = 'audio/mpeg';
    else if (/\.(pdf|doc|docx)($|\?)/i.test(fullMediaUrl)) effectiveMimeType = 'application/pdf';
  }

  const isSticker = !!(
    fullMediaUrl &&
    (effectiveMimeType?.includes('webp') || /^\[sticker/i.test(rawContent))
  );

  const isImage = !!(
    fullMediaUrl &&
    (effectiveMimeType?.startsWith('image/') || /^\[(image|sticker)/i.test(rawContent))
  );
  const isVideo = !!(
    fullMediaUrl &&
    (effectiveMimeType?.startsWith('video/') || /^\[video/i.test(rawContent))
  );
  const isAudio = !!(
    fullMediaUrl &&
    (effectiveMimeType?.startsWith('audio/') || /^\[audio/i.test(rawContent))
  );
  const isDocument = !!(
    fullMediaUrl &&
    (effectiveMimeType?.includes('document') || effectiveMimeType?.includes('pdf') || /^\[document/i.test(rawContent))
  );
  const template = item.template;

  // Clean text & JSON payload extraction
  const actualText = parsedJson?.text || (typeof rawContent === 'string' && rawContent.trim().startsWith('{') ? (parsedJson?.caption || '') : rawContent);
  const isMediaPlaceholder = /^\[(image|video|audio|document|media|sticker)(?:\s+message)?\]/i.test(actualText);
  const cleanText = actualText
    .replace(/^\[(image|video|audio|document|media|sticker)(?:\s+message)?\]\s*/i, '')
    .trim() || (item.caption || parsedJson?.caption || '').trim() || (template?.body?.text || '').trim();

  const effectiveReplyToMessageId = item.replyToMessageId || parsedJson?.replyToMessageId || null;

  const handleDownloadMediaFile = async () => {
    if (fullMediaUrl) {
      try {
        if (Platform.OS === 'web') {
          const a = document.createElement('a');
          a.href = fullMediaUrl;
          a.download = 'whatsapp_media.jpg';
          a.click();
        } else {
          await Linking.openURL(fullMediaUrl);
        }
      } catch (e) {
        console.error("Error opening media URL", e);
      }
    }
  };

  const handleSendModalReply = async () => {
    if (!modalReplyText.trim() || modalSending) return;
    setModalSending(true);
    try {
      await onSendDirectReply?.(modalReplyText.trim(), item);
      setModalReplyText('');
      setIsReplyingInModal(false);
      setIsFullscreenVisible(false);
    } catch (e) {
      console.error("Failed to send modal reply", e);
    } finally {
      setModalSending(false);
    }
  };

  // Clean quote box helper
  const renderQuoteBox = () => {
    if (!item.replyTo && !effectiveReplyToMessageId) return null;

    const repliedMessage = messages.find(
      (m) =>
        (m.whatsappMessageId && m.whatsappMessageId === effectiveReplyToMessageId) ||
        m.id === effectiveReplyToMessageId
    ) || item.replyTo;

    const isRepliedByMe = repliedMessage?.direction === 'outbound' || repliedMessage?.sender === 'executive';
    const authorName = isRepliedByMe ? 'You' : (activeConv?.name || activeConv?.whatsappName || 'Contact');
    let quoteTextSnippet = repliedMessage?.text || repliedMessage?.content || repliedMessage?.caption || 'Media Message';

    if (typeof quoteTextSnippet === 'string' && quoteTextSnippet.trim().startsWith('{')) {
      try {
        const qJson = JSON.parse(quoteTextSnippet);
        quoteTextSnippet = qJson.text || qJson.caption || 'Media Message';
      } catch (e) { }
    }

    return (
      <View style={styles.quoteBox}>
        <Text style={styles.quoteAuthor}>{authorName}</Text>
        <Text style={styles.quoteText} numberOfLines={2}>
          {quoteTextSnippet}
        </Text>
      </View>
    );
  };

  return (
    <>
      {showDate && (
        <View style={styles.dateSeparator}>
          <Text style={styles.dateSeparatorText}>{getDateLabel(item.createdAt)}</Text>
        </View>
      )}
      <View style={[styles.msgWrapper, isMe ? styles.msgMe : styles.msgOther]}>
        <TouchableOpacity
          activeOpacity={0.85}
          onLongPress={() => onSelectReply?.(item)}
          style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther, (isImage || isSticker) && !cleanText && styles.bubbleImageOnly]}
        >
          {/* Replied message quote header */}
          {renderQuoteBox()}

          {/* Template Header */}
          {template?.header && (
            <View style={styles.templateHeaderBox}>
              {template.header.type === 'IMAGE' && template.header.mediaUrl && (
                <Image
                  source={{
                    uri: template.header.mediaUrl.startsWith('http')
                      ? template.header.mediaUrl
                      : `${getBackendUrl()}${template.header.mediaUrl.startsWith('/') ? '' : '/'}${template.header.mediaUrl}`,
                    headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
                  }}
                  style={styles.templateHeaderMedia}
                  resizeMode="cover"
                />
              )}
              {template.header.type === 'VIDEO' && (
                <View style={styles.mediaPlaceholder}>
                  <VideoIcon size={22} color="#00ed64" />
                  <Text style={styles.mediaPlaceholderText}>Video Header</Text>
                </View>
              )}
              {template.header.type === 'DOCUMENT' && (
                <View style={styles.mediaPlaceholder}>
                  <FileText size={20} color="#f43f5e" />
                  <Text style={styles.mediaPlaceholderText}>Document Header</Text>
                </View>
              )}
              {template.header.type === 'TEXT' && template.header.text && (
                <Text style={styles.templateHeaderText}>{template.header.text}</Text>
              )}
            </View>
          )}

          {/* Media Attachments (Images & Stickers) */}
          {isImage && mediaImageSource && (
            <TouchableOpacity activeOpacity={0.9} onPress={() => setIsFullscreenVisible(true)}>
              <Image
                source={mediaImageSource}
                style={isSticker ? styles.bubbleStickerImage : styles.bubbleMediaImage}
                resizeMode={isSticker ? 'contain' : 'cover'}
                onError={() => setImageError(true)}
              />
            </TouchableOpacity>
          )}
          {isVideo && (
            <View style={styles.mediaPlaceholder}>
              <VideoIcon size={22} color="#00ed64" />
              <Text style={styles.mediaPlaceholderText}>Video Message</Text>
            </View>
          )}
          {isAudio && (
            <View style={styles.mediaPlaceholder}>
              <Play size={18} color="#22d3ee" />
              <Text style={styles.mediaPlaceholderText}>Voice Message</Text>
            </View>
          )}
          {isDocument && (
            <View style={styles.mediaPlaceholder}>
              <FileText size={20} color="#f43f5e" />
              <Text style={styles.mediaPlaceholderText}>Document Attachment</Text>
            </View>
          )}

          {/* Clean Message Body Text */}
          {cleanText.length > 0 && (
            <Text style={[styles.msgContent, isMe ? styles.msgContentMe : styles.msgContentOther]}>
              {cleanText}
            </Text>
          )}

          {/* Template Footer */}
          {template?.footer?.text && (
            <Text style={styles.templateFooterText}>{template.footer.text}</Text>
          )}

          {/* Template Quick Reply Buttons */}
          {template?.buttons && template.buttons.length > 0 && (
            <View style={styles.templateButtonsContainer}>
              {template.buttons.map((btn: any, bIdx: number) => (
                <View key={bIdx} style={styles.templateButtonRow}>
                  <Text style={styles.templateButtonText}>{btn.text}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Message Meta & Status Ticks */}
          <View style={styles.msgMeta}>
            <Text style={[styles.msgTime, isMe ? styles.msgTimeMe : styles.msgTimeOther]}>{formattedTime}</Text>
            {isMe && (
              <View style={styles.statusWrapper}>
                {item.status === 'read' ? (
                  <CheckCheck size={14} color="#22d3ee" />
                ) : item.status === 'delivered' ? (
                  <CheckCheck size={14} color="#8ea0bc" />
                ) : item.status === 'sent' ? (
                  <Check size={14} color="#8ea0bc" />
                ) : item.status === 'failed' ? (
                  <AlertCircle size={14} color="#f87171" />
                ) : (
                  <Clock size={12} color="#8ea0bc" />
                )}
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* WhatsApp Fullscreen Image Viewer Modal */}
      {isImage && mediaImageSource && (
        <Modal
          visible={isFullscreenVisible}
          transparent={false}
          animationType="fade"
          onRequestClose={() => {
            setIsFullscreenVisible(false);
            setIsReplyingInModal(false);
          }}
        >
          <StatusBar barStyle="light-content" backgroundColor="#000000" />
          <SafeAreaView style={styles.fullScreenOverlay}>
            {/* Top Header Bar */}
            <View style={styles.fullScreenHeader}>
              <TouchableOpacity
                onPress={() => {
                  setIsFullscreenVisible(false);
                  setIsReplyingInModal(false);
                }}
                style={styles.fullScreenHeaderBackBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <ArrowLeft size={22} color="#ffffff" />
              </TouchableOpacity>

              <View style={styles.fullScreenHeaderTitleBox}>
                <Text style={styles.fullScreenAuthorText}>
                  {isMe ? 'You' : (activeConv?.name || activeConv?.whatsappName || 'Contact')}
                </Text>
                <Text style={styles.fullScreenTimeText}>{formattedTime}</Text>
              </View>

              <TouchableOpacity
                onPress={handleDownloadMediaFile}
                style={styles.fullScreenHeaderActionBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Download size={22} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {/* Main Center Image */}
            <View style={styles.fullScreenImageContainer}>
              <Image
                source={mediaImageSource}
                style={styles.fullScreenImage}
                resizeMode="contain"
              />

              {/* Caption Overlay over lower image (only when not replying) */}
              {cleanText && !isReplyingInModal ? (
                <View style={styles.fullScreenCaptionOverlay}>
                  <Text style={styles.fullScreenCaptionText}>{cleanText}</Text>
                </View>
              ) : null}
            </View>

            {/* WhatsApp In-Modal Floating Reply Bar */}
            {isReplyingInModal ? (
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.fullScreenKeyboardWrapper}
              >
                <View style={styles.fullScreenFloatingReplyBox}>
                  {/* Top Half: Quoted Media Header */}
                  <View style={styles.fullScreenQuoteCardHeader}>
                    <View style={styles.fullScreenQuoteGreenBar} />
                    <View style={{ flex: 1, paddingHorizontal: 10, paddingVertical: 4 }}>
                      <Text style={styles.fullScreenQuoteAuthorText}>
                        {isMe ? 'You' : (activeConv?.name || activeConv?.whatsappName || 'Contact')}
                      </Text>
                      <View style={styles.fullScreenQuoteSnippetRow}>
                        <FileText size={12} color="#8ea0bc" style={{ marginRight: 4 }} />
                        <Text style={styles.fullScreenQuoteSnippetText} numberOfLines={1}>
                          {cleanText || 'Photo'}
                        </Text>
                      </View>
                    </View>
                    {mediaImageSource && (
                      <Image
                        source={mediaImageSource}
                        style={styles.fullScreenQuoteThumbImage}
                        resizeMode="cover"
                      />
                    )}
                    <TouchableOpacity
                      onPress={() => setIsReplyingInModal(false)}
                      style={{ padding: 6 }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <X size={14} color="#8ea0bc" />
                    </TouchableOpacity>
                  </View>

                  {/* Bottom Half: Input Line with Icons */}
                  <View style={styles.fullScreenQuoteInputLine}>
                    <TouchableOpacity style={styles.fullScreenIconBtn}>
                      <Text style={{ fontSize: 18 }}>😃</Text>
                    </TouchableOpacity>

                    <TextInput
                      style={styles.fullScreenQuoteTextInput}
                      placeholder="Reply..."
                      placeholderTextColor="#8ea0bc"
                      value={modalReplyText}
                      onChangeText={setModalReplyText}
                      autoFocus={true}
                    />

                    <TouchableOpacity style={styles.fullScreenIconBtn}>
                      <Paperclip size={18} color="#8ea0bc" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.fullScreenIconBtn}>
                      <Camera size={18} color="#8ea0bc" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Floating Green Circle Send Button on Right */}
                <TouchableOpacity
                  style={[styles.fullScreenFloatingSendCircle, !modalReplyText.trim() && styles.fullScreenFloatingSendDisabled]}
                  disabled={!modalReplyText.trim() || modalSending}
                  onPressIn={handleSendModalReply}
                  onPress={handleSendModalReply}
                >
                  <Send size={20} color="#ffffff" />
                </TouchableOpacity>
              </KeyboardAvoidingView>
            ) : (
              <View style={styles.fullScreenBottomReplyContainer}>
                <TouchableOpacity
                  style={styles.fullScreenReplyBox}
                  activeOpacity={0.8}
                  onPress={() => setIsReplyingInModal(true)}
                >
                  <Text style={styles.fullScreenReplyPlaceholder}>Reply</Text>
                </TouchableOpacity>
              </View>
            )}
          </SafeAreaView>
        </Modal>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateSeparatorText: {
    fontSize: 11,
    color: '#8ea0bc',
    backgroundColor: '#182229',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#222d34',
    fontWeight: '500',
  },
  msgWrapper: {
    flexDirection: 'row',
    marginBottom: 4,
    width: '100%',
  },
  msgMe: {
    justifyContent: 'flex-end',
  },
  msgOther: {
    justifyContent: 'flex-start',
  },
  bubble: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    maxWidth: '78%',
  },
  bubbleMe: {
    backgroundColor: '#005c4b',
    borderTopRightRadius: 0,
  },
  bubbleOther: {
    backgroundColor: '#202c33',
    borderTopLeftRadius: 0,
  },
  bubbleImageOnly: {
    padding: 3,
    paddingBottom: 4,
    maxWidth: '84%',
  },
  msgContent: {
    fontSize: 14,
    lineHeight: 19,
  },
  msgContentMe: {
    color: '#e9edef',
  },
  msgContentOther: {
    color: '#f8fafc',
  },
  msgMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 3,
    gap: 3,
  },
  msgTime: {
    fontSize: 10,
  },
  msgTimeMe: {
    color: '#8ea0bc',
  },
  msgTimeOther: {
    color: '#8ea0bc',
  },
  statusWrapper: {
    marginLeft: 2,
  },
  quoteBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderLeftWidth: 3,
    borderLeftColor: '#00ed64',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 6,
  },
  quoteAuthor: {
    color: '#00ed64',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  quoteText: {
    color: '#cbd5e1',
    fontSize: 12,
  },
  templateHeaderBox: {
    marginBottom: 6,
    borderRadius: 8,
    overflow: 'hidden',
  },
  templateHeaderMedia: {
    width: '100%',
    height: 140,
    borderRadius: 8,
  },
  templateHeaderText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  templateFooterText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
  },
  templateButtonsContainer: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 6,
    gap: 4,
  },
  templateButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  templateButtonText: {
    color: '#00ed64',
    fontSize: 13,
    fontWeight: '600',
  },
  bubbleMediaImage: {
    width: 250,
    height: 190,
    borderRadius: 8,
    marginBottom: 2,
  },
  mediaPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    marginBottom: 4,
  },
  bubbleStickerImage: {
    width: 150,
    height: 150,
    borderRadius: 8,
    marginBottom: 2,
  },
  mediaPlaceholderText: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '500',
  },
  fullScreenOverlay: {
    flex: 1,
    backgroundColor: '#000000',
  },
  fullScreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#000000',
    zIndex: 10,
  },
  fullScreenHeaderBackBtn: {
    padding: 4,
    marginRight: 16,
  },
  fullScreenHeaderTitleBox: {
    flex: 1,
  },
  fullScreenAuthorText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fullScreenTimeText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  fullScreenHeaderActionBtn: {
    padding: 6,
    marginLeft: 12,
  },
  fullScreenImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
  },
  fullScreenCaptionOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  fullScreenCaptionText: {
    color: '#ffffff',
    fontSize: 15,
    textAlign: 'left',
  },
  fullScreenBottomReplyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0b141a',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: '#1f2c34',
  },
  fullScreenReplyBox: {
    flex: 1,
    height: 40,
    backgroundColor: '#1f2c34',
    borderRadius: 20,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  fullScreenReplyPlaceholder: {
    color: '#8ea0bc',
    fontSize: 14,
  },
  fullScreenKeyboardWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    backgroundColor: 'transparent',
    gap: 8,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  fullScreenFloatingReplyBox: {
    flex: 1,
    backgroundColor: '#1f2c34',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  fullScreenQuoteCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingRight: 6,
  },
  fullScreenQuoteGreenBar: {
    width: 4,
    height: '100%',
    backgroundColor: '#00ed64',
    borderTopLeftRadius: 16,
  },
  fullScreenQuoteAuthorText: {
    color: '#00ed64',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  fullScreenQuoteSnippetRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fullScreenQuoteSnippetText: {
    color: '#cbd5e1',
    fontSize: 12,
    flex: 1,
  },
  fullScreenQuoteThumbImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginVertical: 4,
  },
  fullScreenQuoteInputLine: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 8,
  },
  fullScreenIconBtn: {
    padding: 4,
  },
  fullScreenQuoteTextInput: {
    flex: 1,
    fontSize: 15,
    color: '#ffffff',
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
  },
  fullScreenFloatingSendCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#00a884',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  fullScreenFloatingSendDisabled: {
    backgroundColor: '#1e293b',
    opacity: 0.6,
  },
});
