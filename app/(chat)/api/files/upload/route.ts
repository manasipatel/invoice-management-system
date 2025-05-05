import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { extractJsonFromText } from "@/lib/utils";
import { getInvoiceById } from "@/lib/db/queries";
import { cached } from "@/lib/middleware/local-middleware";

// Use Blob instead of File since File is not available in Node.js environment
const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= 5 * 1024 * 1024, {
      message: "File size should be less than 5MB",
    })
    // Update the file type based on the kind of files you want to accept
    .refine(
      (file) =>
        ["image/jpeg", "image/png", "application/pdf"].includes(file.type),
      {
        message: "File type should be JPEG or PNG or PDF",
      }
    ),
});

async function checkInvoice(file: Blob, fileType: string, url: string) {
  /// call openai to check if the file is an invoice

  const systemPrompt = `You are an intelligent assistant. Your task is to determine whether a given document is an invoice. Respond with JSON with a key called "isInvoice" and a value of "Yes" or "No" and "invoice_number" if it is an invoice else N/A
  
  Output only JSON format
  eg.
  {
    "isInvoice": "Yes",
    "invoice_number": "123456"}
  .`;
  const { text } = await generateText({
    model: cached(openai("gpt-4o")),
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Here is the document`,
          },
          fileType === "application/pdf"
            ? {
                type: "file",
                data: url,
                mimeType: fileType,
              }
            : {
                type: "image",
                image: url,
                mimeType: fileType,
              },
        ],
      },
    ],
  });

  /// check if the response is in JSON format
  try {
    const jsonResponse = extractJsonFromText(text);
    if (jsonResponse.isInvoice === "Yes") {
      const invoiceNumber = jsonResponse.invoice_number;
      const invoice = await getInvoiceById({ id: invoiceNumber });

      if (invoice) {
        return { success: false, reason: "Invoice already processed" };
      } else {
        return { success: true };
      }
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    throw new Error(
      error?.message || "Failed to parse JSON response for invoice check"
    );
  }

  return { success: false, reason: "Not an invoice" };
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (request.body === null) {
    return new Response("Request body is empty", { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as Blob;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const validatedFile = FileSchema.safeParse({ file });

    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.errors
        .map((error) => error.message)
        .join(", ");

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Get filename from formData since Blob doesn't have name property
    const filename = (formData.get("file") as File).name;
    const fileBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(fileBuffer);

    try {
      // Generate unique filename with timestamp
      const timestamp = Date.now();
      const uniqueFilename = `${timestamp}-${filename}`;

      // Create data URL for immediate preview
      const dataURL = `data:${file.type};base64,${buffer.toString("base64")}`;

      /// check if the uploaded files is an invoice
      const isInvoice = await checkInvoice(file, file.type, dataURL);
      if (isInvoice?.success) {
        return NextResponse.json({
          url: dataURL,
          pathname: `/uploads/${uniqueFilename}`,
          contentType: file.type,
        });
      } else {
        return NextResponse.json(
          { error: isInvoice?.reason || "Not an invoice" },
          { status: 400 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: error || "Upload failed" },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
