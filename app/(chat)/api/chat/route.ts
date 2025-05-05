import {
  type Message,
  createDataStreamResponse,
  smoothStream,
  streamText,
  wrapLanguageModel,
} from "ai";

import { auth } from "@/app/(auth)/auth";
import { myProvider } from "@/lib/ai/models";
import { systemPrompt } from "@/lib/ai/prompts";
import {
  createInvoice,
  createInvoiceLineItems,
  deleteChatById,
  getChatById,
  saveChat,
  saveMessages,
  saveTokenUsage,
} from "@/lib/db/queries";
import {
  generateUUID,
  getMostRecentUserMessage,
  sanitizeResponseMessages,
  extractJsonFromText,
  parseDate_YYYYMMDD,
  calculateCost,
  modelPricing,
} from "@/lib/utils";

import { generateTitleFromUserMessage } from "../../actions";
import { createDocument } from "@/lib/ai/tools/create-document";
import { updateDocument } from "@/lib/ai/tools/update-document";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import { getWeather } from "@/lib/ai/tools/get-weather";
import { cacheMiddleware } from "@/lib/middleware/middleware";
import { cached } from "@/lib/middleware/local-middleware";

export const maxDuration = 60;

export async function POST(request: Request) {
  const {
    id,
    messages,
    selectedChatModel,
  }: { id: string; messages: Array<Message>; selectedChatModel: string } =
    await request.json();

  /// middleware to cache the model response
  const wrappedModel = wrapLanguageModel({
    model: myProvider.languageModel(selectedChatModel),
    middleware: cacheMiddleware,
  });

  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userMessage = getMostRecentUserMessage(messages);

  if (!userMessage) {
    return new Response("No user message found", { status: 400 });
  }

  const chat = await getChatById({ id });

  if (!chat) {
    const title = await generateTitleFromUserMessage({ message: userMessage });
    await saveChat({ id, userId: session.user.id, title });
  }

  await saveMessages({
    messages: [{ ...userMessage, createdAt: new Date(), chatId: id }],
  });

  return createDataStreamResponse({
    execute: (dataStream) => {
      const result = streamText({
        model: cached(myProvider.languageModel(selectedChatModel)),
        system: systemPrompt({ selectedChatModel }),
        messages,
        maxSteps: 5,
        experimental_activeTools:
          selectedChatModel === "chat-model-reasoning"
            ? []
            : [
                "getWeather",
                "createDocument",
                "updateDocument",
                "requestSuggestions",
              ],
        experimental_transform: smoothStream({ chunking: "word" }),
        experimental_generateMessageId: generateUUID,
        tools: {
          getWeather,
          createDocument: createDocument({ session, dataStream }),
          updateDocument: updateDocument({ session, dataStream }),
          requestSuggestions: requestSuggestions({
            session,
            dataStream,
          }),
        },
        onFinish: async ({ response, reasoning, usage }) => {
          if (session.user?.id) {
            try {
              const sanitizedResponseMessages = sanitizeResponseMessages({
                messages: response.messages,
                reasoning,
              });

              // Extract token usage information (if available from the API)
              const promptTokens = usage?.promptTokens;
              const completionTokens = usage?.completionTokens;
              const totalTokens = promptTokens + completionTokens;

              /// get the model pricing based on the selected chat model
              const modelName = selectedChatModel?.endsWith("-claude")
                ? "claude-3-5-sonnet"
                : "gpt-4o";
              const model: {
                promptTokensPrice: number;
                completionTokensPrice: number;
              } = modelPricing(modelName);
              // Calculate cost based on token usage
              const cost = calculateCost(
                promptTokens,
                completionTokens,
                model.promptTokensPrice,
                model.completionTokensPrice
              );

              /// store the invoice in the database
              try {
                const invoice = extractJsonFromText(
                  response.messages[0]?.content?.[0]?.text
                );
                /// store the invoice in the database
                const invoiceId = generateUUID();
                await createInvoice({
                  id: invoiceId,
                  customerName: invoice.customer_name,
                  vendorName: invoice.vendor_name,
                  invoiceNumber: invoice.invoice_number,
                  invoiceDate: invoice?.invoice_date
                    ? parseDate_YYYYMMDD(invoice.invoice_date)
                    : null,
                  dueDate: invoice?.due_date
                    ? parseDate_YYYYMMDD(invoice.due_date)
                    : null,
                  amount: invoice.amount,
                });

                /// store the invoice items in the database
                for (let invoiceItem of invoice?.line_items) {
                  await createInvoiceLineItems({
                    id: generateUUID(),
                    invoiceId: invoiceId,
                    description: invoiceItem.description,
                    quantity: invoiceItem.quantity,
                    unitPrice: invoiceItem.unit_price,
                    total: invoiceItem.total,
                  });
                }

                // Save token usage for this invoice processing
                await saveTokenUsage({
                  invoiceId,
                  promptTokens,
                  completionTokens,
                  totalTokens,
                  cost,
                });

                console.log(
                  `Processed invoice ${invoiceId} using ${totalTokens} tokens at a cost of ${cost}`
                );
              } catch (error) {
                console.error("Error while parsing invoice details", error);
              }

              await saveMessages({
                messages: sanitizedResponseMessages.map((message) => {
                  return {
                    id: message.id,
                    chatId: id,
                    role: message.role,
                    content: message.content,
                    createdAt: new Date(),
                  };
                }),
              });
            } catch (error) {
              console.error("Failed to save chat");
            }
          }
        },
        experimental_telemetry: {
          isEnabled: true,
          functionId: "stream-text",
        },
      });

      result.mergeIntoDataStream(dataStream, {
        sendReasoning: true,
      });
    },
    onError: (e) => {
      console.log("Error in streamText", e);

      return "Oops, an error occured!";
    },
  });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response("Not Found", { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    await deleteChatById({ id });

    return new Response("Chat deleted", { status: 200 });
  } catch (error) {
    return new Response("An error occurred while processing your request", {
      status: 500,
    });
  }
}
