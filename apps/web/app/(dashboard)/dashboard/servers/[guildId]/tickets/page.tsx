"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Bot, Send, Ticket as TicketIcon, User as UserIcon } from "lucide-react";
import { RealtimeEvent } from "@nexusbot/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiGet, apiPost, ApiError } from "@/lib/api";
import { useRealtime } from "@/hooks/use-realtime";
import { cn } from "@/lib/utils";
import type { Ticket, TicketMessage, TicketStatus } from "@/types";

const STATUS_VARIANT: Record<TicketStatus, "success" | "warning" | "secondary"> = {
  OPEN: "success",
  PENDING: "warning",
  CLOSED: "secondary",
};

export default function TicketsPage() {
  const { guildId } = useParams<{ guildId: string }>();
  const [tickets, setTickets] = React.useState<Ticket[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [selected, setSelected] = React.useState<Ticket | null>(null);
  const [messages, setMessages] = React.useState<TicketMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = React.useState(false);
  const [reply, setReply] = React.useState("");
  const [sending, setSending] = React.useState(false);

  const { items: liveTicketEvents } = useRealtime([RealtimeEvent.TicketOpened, RealtimeEvent.TicketClosed], {
    guildId,
    maxEvents: 1,
  });
  const { items: liveMessages } = useRealtime<TicketMessage>([RealtimeEvent.TicketMessage], { guildId, maxEvents: 1 });

  const loadTickets = React.useCallback(() => {
    setLoading(true);
    apiGet<Ticket[]>(`/guilds/${guildId}/tickets`)
      .then(setTickets)
      .catch(() => setTickets([]))
      .finally(() => setLoading(false));
  }, [guildId]);

  React.useEffect(() => {
    loadTickets();
  }, [loadTickets, liveTicketEvents.length]);

  React.useEffect(() => {
    if (!selected) return;
    setMessagesLoading(true);
    apiGet<TicketMessage[]>(`/guilds/${guildId}/tickets/${selected.id}/messages`)
      .then(setMessages)
      .catch(() => setMessages([]))
      .finally(() => setMessagesLoading(false));
  }, [selected, guildId]);

  React.useEffect(() => {
    const latest = liveMessages[0]?.data;
    if (latest && selected && latest.ticketId === selected.id) {
      setMessages((prev) => [...prev, latest]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveMessages]);

  const filtered = statusFilter === "ALL" ? tickets : tickets.filter((t) => t.status === statusFilter);

  async function sendReply() {
    if (!selected || !reply.trim()) return;
    setSending(true);
    try {
      const msg = await apiPost<TicketMessage>(`/guilds/${guildId}/tickets/${selected.id}/messages`, {
        content: reply.trim(),
      });
      setMessages((prev) => [...prev, msg]);
      setReply("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card glass className="lg:col-span-1">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <TicketIcon className="h-4 w-4" /> Tickets
          </CardTitle>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="max-h-[600px] space-y-2 overflow-y-auto">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No tickets found.</p>
          ) : (
            filtered.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => setSelected(ticket)}
                className={cn(
                  "w-full rounded-lg border border-border/60 p-3 text-left transition-colors hover:bg-muted/50",
                  selected?.id === ticket.id && "border-primary/50 bg-primary/10",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-muted-foreground">#{ticket.ticketNumber}</span>
                  <Badge variant={STATUS_VARIANT[ticket.status]} className="text-[10px]">
                    {ticket.status}
                  </Badge>
                </div>
                <p className="mt-1 truncate text-sm font-medium">{ticket.subject}</p>
                <p className="text-xs text-muted-foreground">
                  {ticket.openerTag} · {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                </p>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      <Card glass className="flex flex-col lg:col-span-2">
        {!selected ? (
          <CardContent className="flex flex-1 flex-col items-center justify-center gap-2 py-24 text-center">
            <TicketIcon className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Select a ticket to view its conversation.</p>
          </CardContent>
        ) : (
          <>
            <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-border/60">
              <div>
                <CardTitle className="text-base">
                  #{selected.ticketNumber} — {selected.subject}
                </CardTitle>
                <p className="text-xs text-muted-foreground">Opened by {selected.openerTag}</p>
              </div>
              <Badge variant={STATUS_VARIANT[selected.status]}>{selected.status}</Badge>
            </CardHeader>
            <CardContent className="flex max-h-[480px] flex-1 flex-col gap-3 overflow-y-auto py-4">
              {messagesLoading ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-2/3" />)
              ) : messages.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No messages yet.</p>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className="flex items-start gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                      {msg.isAiReply ? <Bot className="h-4 w-4" /> : <UserIcon className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{msg.authorTag}</span>
                        {msg.isAiReply && (
                          <Badge variant="gradient" className="text-[10px]">
                            AI
                          </Badge>
                        )}
                        <span className="ml-auto text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="mt-0.5 whitespace-pre-wrap text-sm text-foreground/90">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
            {selected.status !== "CLOSED" && (
              <div className="flex items-center gap-2 border-t border-border/60 p-4">
                <Input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Type a reply…"
                  onKeyDown={(e) => e.key === "Enter" && sendReply()}
                />
                <Button onClick={sendReply} loading={sending} variant="gradient" size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
