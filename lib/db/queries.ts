import "server-only";
import { and, asc, desc, eq, gt, gte, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";

import {
  chat,
  document,
  type Suggestion,
  suggestion,
  type Message,
  message,
  vote,
  Invoice,
  invoice,
  InvoiceLineItem,
  invoiceLineItem,
  tokenUsage,
  inputToken,
} from "./schema";
import type { BlockKind } from "@/components/block";

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

// biome-ignore lint: Forbidden non-null assertion.
const sqlite = new Database("sqlite.db");
const db = drizzle(sqlite);

export async function saveChat({
  id,
  userId,
  title,
}: {
  id: string;
  userId: string;
  title: string;
}) {
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      // userId,
      title,
    });
  } catch (error) {
    console.error("Failed to save chat in database");
    throw error;
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));

    return await db.delete(chat).where(eq(chat.id, id));
  } catch (error) {
    console.error("Failed to delete chat by id from database");
    throw error;
  }
}

export async function getChatsByUserId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(chat)
      // .where(eq(chat.userId, id))
      .orderBy(desc(chat.createdAt));
  } catch (error) {
    console.error("Failed to get chats by user from database");
    throw error;
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat;
  } catch (error) {
    console.error("Failed to get chat by id from database");
    throw error;
  }
}

export async function saveMessages({ messages }: { messages: Array<Message> }) {
  try {
    return await db.insert(message).values(messages);
  } catch (error) {
    console.error("Failed to save messages in database", error);
    throw error;
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (error) {
    console.error("Failed to get messages by chat id from database", error);
    throw error;
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: "up" | "down";
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === "up" })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === "up",
    });
  } catch (error) {
    console.error("Failed to upvote message in database", error);
    throw error;
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (error) {
    console.error("Failed to get votes by chat id from database", error);
    throw error;
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: BlockKind;
  content: string;
  userId: string;
}) {
  try {
    return await db.insert(document).values({
      id,
      title,
      kind,
      content,
      // userId,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("Failed to save document in database");
    throw error;
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (error) {
    console.error("Failed to get document by id from database");
    throw error;
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (error) {
    console.error("Failed to get document by id from database");
    throw error;
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp)
        )
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)));
  } catch (error) {
    console.error(
      "Failed to delete documents by id after timestamp from database"
    );
    throw error;
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<Suggestion>;
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (error) {
    console.error("Failed to save suggestions in database");
    throw error;
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(and(eq(suggestion.documentId, documentId)));
  } catch (error) {
    console.error(
      "Failed to get suggestions by document version from database"
    );
    throw error;
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (error) {
    console.error("Failed to get message by id from database");
    throw error;
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp))
      );

    const messageIds = messagesToDelete.map((message) => message.id);

    if (messageIds.length > 0) {
      await db
        .delete(vote)
        .where(
          and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds))
        );

      return await db
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), inArray(message.id, messageIds))
        );
    }
  } catch (error) {
    console.error(
      "Failed to delete messages by id after timestamp from database"
    );
    throw error;
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: "private" | "public";
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (error) {
    console.error("Failed to update chat visibility in database");
    throw error;
  }
}

// Create a new invoice
export async function createInvoice(data: Invoice) {
  try {
    return await db.insert(invoice).values(data);
  } catch (error) {
    console.error("Failed to create invoice in database");
    throw error;
  }
}

// Get a single invoice by ID
export async function getInvoiceById({ id }: { id: string }) {
  try {
    const [selectedInvoice] = await db
      .select()
      .from(invoice)
      .where(eq(invoice.invoiceNumber, id));
    return selectedInvoice;
  } catch (error) {
    console.error("Failed to get invoice by id from database");
    throw error;
  }
}

// Get all invoices with line items (optionally you can filter or paginate later)
export async function getAllInvoices() {
  try {
    // Get all invoices and join with line items and token usage
    const invoices = await db
      .select({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        vendorName: invoice.vendorName,
        customerName: invoice.customerName,
        invoiceDate: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        amount: invoice.amount,
      })
      .from(invoice);

    const invoicesWithItems = await Promise.all(
      invoices.map(async (inv) => {
        const items = await db
          .select({
            id: invoiceLineItem.id,
            description: invoiceLineItem.description,
            quantity: invoiceLineItem.quantity,
            unitPrice: invoiceLineItem.unitPrice,
            total: invoiceLineItem.total,
          })
          .from(invoiceLineItem)
          .where(eq(invoiceLineItem.invoiceId, inv.id));
        return {
          ...inv,
          lineItems: items,
        };
      })
    );

    // Optionally, you can also join with token usage if needed
    const invoicesWithTokenUsage = await Promise.all(
      invoicesWithItems.map(async (inv) => {
        const tokenUsageData = await db
          .select({
            totalTokens: tokenUsage.totalTokens,
          })
          .from(tokenUsage)
          .where(eq(tokenUsage.invoiceId, inv.id));
        return {
          ...inv,
          tokenUsage: tokenUsageData[0] || null,
        };
      })
    );

    return invoicesWithTokenUsage;
  } catch (error) {
    console.error("Failed to get all invoices from database");
    throw error;
  }
}

// Delete invoice by ID (also deletes associated line items)
export async function deleteInvoiceById({ id }: { id: string }) {
  try {
    await db.delete(invoiceLineItem).where(eq(invoiceLineItem.invoiceId, id));
    /// keep the token usage data even if the invoice is deleted

    return await db.delete(invoice).where(eq(invoice.id, id));
  } catch (error) {
    console.error("Failed to delete invoice from database");
    throw error;
  }
}

// Create multiple line items for an invoice
export async function createInvoiceLineItems(items: InvoiceLineItem[]) {
  try {
    return await db.insert(invoiceLineItem).values(items);
  } catch (error) {
    console.error("Failed to create invoice line items in database");
    throw error;
  }
}

// Get all line items for a specific invoice
export async function getInvoiceLineItemsByInvoiceId({
  invoiceId,
}: {
  invoiceId: string;
}) {
  try {
    return await db
      .select()
      .from(invoiceLineItem)
      .where(eq(invoiceLineItem.invoiceId, invoiceId));
  } catch (error) {
    console.error(
      "Failed to get invoice line items by invoiceId from database"
    );
    throw error;
  }
}

// Delete line items for an invoice
export async function deleteInvoiceLineItemsByInvoiceId({
  invoiceId,
}: {
  invoiceId: string;
}) {
  try {
    return await db
      .delete(invoiceLineItem)
      .where(eq(invoiceLineItem.invoiceId, invoiceId));
  } catch (error) {
    console.error("Failed to delete invoice line items from database");
    throw error;
  }
}

// Update an invoice
export async function updateInvoice({
  id,
  data,
}: {
  id: string;
  data: Partial<Invoice>;
}) {
  try {
    return await db.update(invoice).set(data).where(eq(invoice.id, id));
  } catch (error) {
    console.error("Failed to update invoice in database");
    throw error;
  }
}

// Update a line item
export async function updateInvoiceLineItem({
  id,
  data,
}: {
  id: string;
  data: Partial<InvoiceLineItem>;
}) {
  try {
    return await db
      .update(invoiceLineItem)
      .set(data)
      .where(eq(invoiceLineItem.id, id));
  } catch (error) {
    console.error("Failed to update invoice line item in database");
    throw error;
  }
}

// ============= TOKEN USAGE TRACKING FUNCTIONS =============

// Function to save token usage data
export async function saveTokenUsage({
  invoiceId,
  promptTokens,
  completionTokens,
  totalTokens,
  cost,
}: {
  invoiceId: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: string;
}) {
  try {
    return await db.insert(tokenUsage).values({
      id: crypto.randomUUID(),
      invoiceId,
      promptTokens,
      completionTokens,
      totalTokens,
      cost,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("Failed to save token usage in database", error);
    throw error;
  }
}

// Function to get token usage for a specific invoice
export async function getTokenUsageByInvoiceId({
  invoiceId,
}: {
  invoiceId: string;
}) {
  try {
    return await db
      .select()
      .from(tokenUsage)
      .where(eq(tokenUsage.invoiceId, invoiceId));
  } catch (error) {
    console.error(
      "Failed to get token usage by invoice id from database",
      error
    );
    throw error;
  }
}

// Function to get average invoice cost
export async function getAverageInvoiceCost() {
  try {
    const result = await db
      .select({
        avgCost: sql`avg(cast(${tokenUsage.cost} as real))`,
        avgTokens: sql`avg(${tokenUsage.totalTokens})`,
        totalInvoices: sql`count(distinct ${tokenUsage.id})`,
      })
      .from(tokenUsage);

    return result[0];
  } catch (error) {
    console.error("Failed to get average invoice cost from database", error);
    throw error;
  }
}

// Function to get total token usage
export async function getTotalTokenUsage() {
  try {
    const result = await db
      .select({
        totalPromptTokens: sql`sum(${tokenUsage.promptTokens})`,
        totalCompletionTokens: sql`sum(${tokenUsage.completionTokens})`,
        totalTokens: sql`sum(${tokenUsage.totalTokens})`,
        totalCost: sql`sum(cast(${tokenUsage.cost} as real))`,
      })
      .from(tokenUsage);

    return result[0];
  } catch (error) {
    console.error("Failed to get total token usage from database", error);
    throw error;
  }
}

// Get overall token usage statistics
export async function getTokenUsageStats() {
  try {
    const stats = await db

      .select({
        totalPromptTokens: sql`sum(${tokenUsage.promptTokens})`,

        totalCompletionTokens: sql`sum(${tokenUsage.completionTokens})`,

        totalTokens: sql`sum(${tokenUsage.totalTokens})`,

        totalCost: sql`sum(cast(${tokenUsage.cost} as real))`,

        averageTokensPerInvoice: sql`avg(${tokenUsage.totalTokens})`,

        averageCostPerInvoice: sql`avg(cast(${tokenUsage.cost} as real))`,

        invoiceCount: sql`count(distinct ${tokenUsage.invoiceId})`,
      })

      .from(tokenUsage);

    return stats[0];
  } catch (error) {
    console.error("Failed to get token usage statistics from database", error);

    throw error;
  }
}

// Get monthly token usage statistics
export async function getMonthlyTokenUsageStats() {
  try {
    return await db

      .select({
        month: sql`strftime('%Y-%m', datetime(${tokenUsage.createdAt}/1000, 'unixepoch'))`,

        totalTokens: sql`sum(${tokenUsage.totalTokens})`,

        totalCost: sql`sum(cast(${tokenUsage.cost} as real))`,

        invoiceCount: sql`count(distinct ${tokenUsage.invoiceId})`,

        avgCostPerInvoice: sql`avg(cast(${tokenUsage.cost} as real))`,
      })

      .from(tokenUsage)

      .groupBy(
        sql`strftime('%Y-%m', datetime(${tokenUsage.createdAt}/1000, 'unixepoch'))`
      )

      .orderBy(
        sql`strftime('%Y-%m', datetime(${tokenUsage.createdAt}/1000, 'unixepoch'))`
      );
  } catch (error) {
    console.error(
      "Failed to get monthly token usage statistics from database",
      error
    );

    throw error;
  }
}

// ============= INPUT TOKEN TRACKING FUNCTIONS =============

/**
 * Save input token data
 * Records the number of input tokens saved by using the cache
 */
export async function saveInputTokens({
  chatId,
  messageId,
  tokens,
}: {
  chatId: string | null;
  messageId: string | null;
  tokens: number;
}) {
  try {
    return await db.insert(inputToken).values({
      id: crypto.randomUUID(),
      chatId,
      messageId,
      tokens,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("Failed to save input token data in database", error);
    throw error;
  }
}

/**
 * Get input tokens saved for a specific chat
 */
export async function getInputTokensByChatId({ chatId }: { chatId: string }) {
  try {
    return await db
      .select()
      .from(inputToken)
      .where(eq(inputToken.chatId, chatId))
      .orderBy(desc(inputToken.createdAt));
  } catch (error) {
    console.error("Failed to get input tokens by chat id from database", error);
    throw error;
  }
}

/**
 * Get input tokens saved for a specific message
 */
export async function getInputTokensByMessageId({
  messageId,
}: {
  messageId: string;
}) {
  try {
    return await db
      .select()
      .from(inputToken)
      .where(eq(inputToken.messageId, messageId));
  } catch (error) {
    console.error(
      "Failed to get input tokens by message id from database",
      error
    );
    throw error;
  }
}

/**
 * Get total input tokens saved
 */
export async function getTotalInputTokens(): Promise<number | null> {
  try {
    const result = await db
      .select({
        totalTokens: sql`sum(${inputToken.tokens})`,
        messageCount: sql`count(distinct ${inputToken.messageId})`,
        chatCount: sql`count(distinct ${inputToken.chatId})`,
      })
      .from(inputToken);

    return result[0]?.totalTokens as number | null;
  } catch (error) {
    console.error("Failed to get total input tokens from database", error);
    throw error;
  }
}
