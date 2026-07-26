"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import { connectSocket, getSocket } from "@/lib/socket";

interface UseReadReceiptsProps {
  conversationId?: string;
  readSentRef: React.RefObject<Set<string>>;
  onMarkAsRead?: (conversationId: string) => void;
  messagesLength: number;
}

export function useReadReceipts({
  conversationId,
  readSentRef,
  onMarkAsRead,
  messagesLength,
}: UseReadReceiptsProps) {
  

  // Join conversation + mark read
  useEffect(() => {
    if (!conversationId) return;

    connectSocket();
    const socket = getSocket();

    const maybeMarkRead = async () => {
      if (document.visibilityState !== "visible") return;
      if (readSentRef.current.has(conversationId)) return;

      readSentRef.current.add(conversationId);

      try {
        await api.post(`/api/dashboard/inbox/${conversationId}/mark-read`);
        onMarkAsRead?.(conversationId);
      } catch {
        readSentRef.current.delete(conversationId);
      }
    };

    socket.emit("join-conversation", conversationId);

    requestAnimationFrame(maybeMarkRead);
    document.addEventListener("visibilitychange", maybeMarkRead);

    return () => {
      socket.emit("leave-conversation", conversationId);
      document.removeEventListener("visibilitychange", maybeMarkRead);
    };
  }, [conversationId, onMarkAsRead, readSentRef]);

  // Re-mark read when new messages arrive
  useEffect(() => {
    if (!conversationId) return;
    if (document.visibilityState !== "visible") return;

    if (!readSentRef.current.has(conversationId)) {
      requestAnimationFrame(async () => {
        try {
          readSentRef.current.add(conversationId);
          await api.post(`/api/dashboard/inbox/${conversationId}/mark-read`);
          onMarkAsRead?.(conversationId);
        } catch {
          readSentRef.current.delete(conversationId);
        }
      });
    }
  }, [messagesLength, conversationId, onMarkAsRead, readSentRef]);
}
