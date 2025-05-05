// app/api/invoices/[invoiceId]/line-items/[lineItemId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { updateInvoiceLineItem } from "@/lib/db/queries";
import { InvoiceLineItem } from "@/lib/db/schema";

export async function PATCH(
  req: NextRequest,
  context: { params: { id: string; lid: string } }
) {
  try {
    const { id: invoiceId, lid: lineItemId } = await context.params;
    const { field, value } = await req.json();

    if (!invoiceId || !lineItemId || !field) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    // Build update object
    const updateData: Partial<InvoiceLineItem> = {
      [field]: value,
    };

    const updated = await updateInvoiceLineItem({
      id: lineItemId,
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Line item update failed", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
