import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import {
  X,
  MessageCircle,
  Phone,
  Copy,
  Search,
  Calendar,
  Clock,
  Trash2,
} from 'lucide-react-native';
import { useWallet } from '../../context/WalletContext';
import { colors } from '../../theme/colors';
import { formatDate } from '../../lib/date';
import { MessageChannel } from '../../types';
import { useResponsive } from '../../lib/useResponsive';

interface MessageHistoryModalProps {
  visible: boolean;
  onClose: () => void;
}

export const MessageHistoryModal: React.FC<MessageHistoryModalProps> = ({
  visible,
  onClose,
}) => {
  const { messageHistory, deleteMessageRecord, clearMessageHistory } = useWallet();
  const { isNarrowMobile, isTablet, isDesktop } = useResponsive();
  const isWide = isTablet || isDesktop;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<'all' | MessageChannel>('all');

  const filteredHistory = useMemo(() => {
    return messageHistory.filter((item) => {
      if (selectedChannel !== 'all' && item.channel !== selectedChannel) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.personName.toLowerCase().includes(q);
        const matchesPhone = item.recipientPhone ? item.recipientPhone.includes(q) : false;
        const matchesContent = item.messageContent.toLowerCase().includes(q);
        return matchesName || matchesPhone || matchesContent;
      }
      return true;
    });
  }, [messageHistory, selectedChannel, searchQuery]);

  const getChannelBadge = (channel: MessageChannel) => {
    switch (channel) {
      case 'whatsapp':
        return {
          icon: <MessageCircle size={13} color="#16a34a" />,
          label: 'WhatsApp',
          bg: '#dcfce7',
          color: '#15803d',
        };
      case 'sms':
        return {
          icon: <Phone size={13} color="#2563eb" />,
          label: 'SMS',
          bg: '#dbeafe',
          color: '#1d4ed8',
        };
      case 'copied':
      default:
        return {
          icon: <Copy size={13} color="#475569" />,
          label: 'Copied',
          bg: colors.slate[100],
          color: colors.slate[700],
        };
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'opened_in_whatsapp':
        return 'Opened in WhatsApp';
      case 'opened_in_sms':
        return 'Opened SMS Composer';
      case 'prepared':
        return 'Prepared / Copied';
      default:
        return status;
    }
  };

  const handleClearAll = () => {
    if (messageHistory.length === 0) return;
    Alert.alert(
      'Clear Message History',
      'Are you sure you want to clear all message logs? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: clearMessageHistory },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.backdrop, isWide && styles.backdropWide]}>
        <View
          style={[
            styles.modalCard,
            isWide && styles.modalCardWide,
            isNarrowMobile && styles.modalCardNarrow,
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Message History & Audit</Text>
              <Text style={styles.subtitle}>
                {messageHistory.length} sent reminder{messageHistory.length === 1 ? '' : 's'} logged
              </Text>
            </View>

            <View style={styles.headerRight}>
              {messageHistory.length > 0 && (
                <TouchableOpacity onPress={handleClearAll} style={styles.clearBtn}>
                  <Trash2 size={15} color={colors.expense.text} />
                  <Text style={styles.clearBtnText}>Clear</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <X size={20} color={colors.slate[600]} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Box */}
          <View style={styles.searchBox}>
            <Search size={15} color={colors.slate[400]} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by contact name, phone, or text..."
              placeholderTextColor={colors.slate[400]}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Channel Tabs */}
          <View style={styles.channelTabs}>
            <TouchableOpacity
              style={[styles.channelTab, selectedChannel === 'all' && styles.channelTabActive]}
              onPress={() => setSelectedChannel('all')}
            >
              <Text style={[styles.channelTabText, selectedChannel === 'all' && styles.channelTabTextActive]}>
                All ({messageHistory.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.channelTab, selectedChannel === 'whatsapp' && styles.channelTabActive]}
              onPress={() => setSelectedChannel('whatsapp')}
            >
              <MessageCircle size={13} color={selectedChannel === 'whatsapp' ? '#16a34a' : colors.slate[500]} />
              <Text style={[styles.channelTabText, selectedChannel === 'whatsapp' && styles.channelTabTextActive]}>
                WhatsApp
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.channelTab, selectedChannel === 'sms' && styles.channelTabActive]}
              onPress={() => setSelectedChannel('sms')}
            >
              <Phone size={13} color={selectedChannel === 'sms' ? '#2563eb' : colors.slate[500]} />
              <Text style={[styles.channelTabText, selectedChannel === 'sms' && styles.channelTabTextActive]}>
                SMS
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.channelTab, selectedChannel === 'copied' && styles.channelTabActive]}
              onPress={() => setSelectedChannel('copied')}
            >
              <Copy size={13} color={selectedChannel === 'copied' ? colors.slate[800] : colors.slate[500]} />
              <Text style={[styles.channelTabText, selectedChannel === 'copied' && styles.channelTabTextActive]}>
                Copied
              </Text>
            </TouchableOpacity>
          </View>

          {/* List of Messages */}
          <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
            {filteredHistory.length === 0 ? (
              <View style={styles.emptyBox}>
                <MessageCircle size={32} color={colors.slate[300]} />
                <Text style={styles.emptyTitle}>No messages in history</Text>
                <Text style={styles.emptySub}>
                  Payment reminders or confirmations sent via WhatsApp or SMS will be logged here.
                </Text>
              </View>
            ) : (
              filteredHistory.map((item) => {
                const channelBadge = getChannelBadge(item.channel);
                const timeStr = item.sentAt ? item.sentAt.slice(11, 16) : '';

                return (
                  <View key={item.id} style={styles.msgCard}>
                    <View style={styles.msgHeader}>
                      <View style={styles.msgHeaderLeft}>
                        <View style={[styles.channelBadge, { backgroundColor: channelBadge.bg }]}>
                          {channelBadge.icon}
                          <Text style={[styles.channelBadgeText, { color: channelBadge.color }]}>
                            {channelBadge.label}
                          </Text>
                        </View>
                        <Text style={styles.personName}>{item.personName}</Text>
                        {item.recipientPhone ? (
                          <Text style={styles.recipientPhone}>({item.recipientPhone})</Text>
                        ) : null}
                      </View>

                      <TouchableOpacity
                        onPress={() => deleteMessageRecord(item.id)}
                        style={styles.deleteItemBtn}
                      >
                        <Trash2 size={13} color={colors.slate[400]} />
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.msgContent} numberOfLines={4}>
                      {item.messageContent}
                    </Text>

                    <View style={styles.msgFooter}>
                      <View style={styles.metaRow}>
                        <Calendar size={11} color={colors.slate[400]} />
                        <Text style={styles.metaText}>{formatDate(item.sentAt)}</Text>
                        {timeStr ? (
                          <>
                            <Clock size={11} color={colors.slate[400]} style={{ marginLeft: 4 }} />
                            <Text style={styles.metaText}>{timeStr}</Text>
                          </>
                        ) : null}
                      </View>

                      <View style={styles.statusPill}>
                        <Text style={styles.statusPillText}>{getStatusLabel(item.status)}</Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.backdrop,
    justifyContent: 'flex-end',
  },
  backdropWide: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 28,
    maxHeight: '90%',
  },
  modalCardWide: {
    width: '100%',
    maxWidth: 620,
    borderRadius: 24,
    maxHeight: '85%',
  },
  modalCardNarrow: {
    padding: 16,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.slate[900],
  },
  subtitle: {
    fontSize: 11,
    color: colors.slate[500],
    fontWeight: '500',
    marginTop: 1,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: colors.expense.bg,
    gap: 4,
  },
  clearBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.expense.text,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: colors.slate[100],
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 12,
    color: colors.slate[900],
  },
  channelTabs: {
    flexDirection: 'row',
    backgroundColor: colors.slate[100],
    borderRadius: 12,
    padding: 3,
    marginBottom: 12,
    gap: 2,
  },
  channelTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  channelTabActive: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  channelTabText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.slate[500],
  },
  channelTabTextActive: {
    color: colors.slate[900],
    fontWeight: '800',
  },
  listScroll: {
    flexGrow: 0,
    maxHeight: 460,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.slate[700],
  },
  emptySub: {
    fontSize: 11,
    color: colors.slate[400],
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 260,
  },
  msgCard: {
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    gap: 8,
  },
  msgHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  msgHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    flex: 1,
  },
  channelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  channelBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  personName: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.slate[900],
  },
  recipientPhone: {
    fontSize: 11,
    color: colors.slate[500],
  },
  deleteItemBtn: {
    padding: 4,
  },
  msgContent: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.slate[700],
  },
  msgFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.slate[200],
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 10,
    color: colors.slate[400],
    fontWeight: '600',
  },
  statusPill: {
    backgroundColor: colors.slate[100],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.slate[600],
  },
});
